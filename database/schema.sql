-- ============================================================
-- Cricket Scorer - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLAYERS: Master list of all players across matches
-- ============================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATCHES: Each match session
-- ============================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id TEXT UNIQUE NOT NULL,            -- human-readable like "M001"
  total_overs INT NOT NULL CHECK (total_overs IN (4,5,6,7)),
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  team_a_players UUID[] DEFAULT '{}',       -- array of player IDs
  team_b_players UUID[] DEFAULT '{}',
  players_per_team INT DEFAULT 5,           -- how many players per side (3-11)
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed')),
  toss_winner TEXT,
  elected_to TEXT,                           -- 'bat' or 'bowl'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INNINGS: Each innings of a match
-- ============================================================
CREATE TABLE innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_no INT NOT NULL,                   -- 1 or 2
  batting_team TEXT NOT NULL,
  bowling_team TEXT NOT NULL,
  total_runs INT DEFAULT 0,
  total_wickets INT DEFAULT 0,
  total_balls INT DEFAULT 0,                 -- legal deliveries bowled
  extras INT DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BALLS: Ball-by-ball record
-- Modular columns so leaderboards can correctly attribute:
--   runs       → batsman's personal score
--   extras     → team extras (not credited to any batsman)
--   extra_type → distinguishes wide / noball / bye / legbye
--   wicket_type / is_wicket → dismissal attribution
-- ============================================================
CREATE TABLE balls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  over_number DECIMAL(4,1) NOT NULL,         -- e.g. 1.1, 1.2, ..., 2.1
  ball_number INT NOT NULL,                  -- 1-6 within over (wides/noballs DO NOT increment)
  batsman_id UUID REFERENCES players(id),    -- who faced the ball
  bowler_id UUID REFERENCES players(id),     -- who bowled the ball
  -- BATSMAN RUNS: credited to the batsman in the run-scorers leaderboard
  runs INT DEFAULT 0,
  -- EXTRA RUNS: team extras, NOT credited to any batsman
  --   Wide:      extras = 1 (penalty) + any runs taken (all batting runs on a wide are extras)
  --   No-ball:   extras = 1 (penalty only), bat runs go to `runs` column
  extras INT DEFAULT 0,
  extra_type TEXT CHECK (extra_type IN ('wide','noball','bye','legbye', NULL)),
  -- DISMISSAL
  is_wicket BOOLEAN DEFAULT FALSE,
  wicket_type TEXT,                          -- dismissal type: 'bowled','caught','lbw','run_out','stumped'
  wicket_player_id UUID REFERENCES players(id), -- player who got OUT
  fielder_id UUID REFERENCES players(id),    -- catcher / involved fielder
  -- TOTAL: what the team actually scored on this ball (runs + extras)
  total_runs_ball INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BALL-BY-BALL VIEW (for live scorecard)
-- ============================================================
CREATE VIEW ball_by_ball AS
SELECT
  b.id,
  b.match_id,
  b.innings_id,
  b.over_number,
  b.ball_number,
  b.runs AS bat_runs,
  b.extras,
  b.extra_type,
  b.is_wicket,
  b.wicket_type,
  bat.name AS batsman_name,
  bowl.name AS bowler_name,
  wk.name AS wicket_player_name,
  fld.name AS fielder_name,
  b.total_runs_ball
FROM balls b
LEFT JOIN players bat ON b.batsman_id = bat.id
LEFT JOIN players bowl ON b.bowler_id = bowl.id
LEFT JOIN players wk ON b.wicket_player_id = wk.id
LEFT JOIN players fld ON b.fielder_id = fld.id
ORDER BY b.over_number, b.ball_number;

-- ============================================================
-- LIVE SCORE VIEW (one row per innings)
-- ============================================================
CREATE VIEW live_score AS
SELECT
  m.match_id,
  i.innings_no,
  i.batting_team,
  i.bowling_team,
  i.total_runs,
  i.total_wickets,
  i.total_balls,
  i.extras,
  m.total_overs,
  ROUND(i.total_balls::DECIMAL / 6, 1) AS overs_bowled,
  CASE
    WHEN i.total_balls > 0 THEN ROUND(i.total_runs::DECIMAL / (i.total_balls::DECIMAL/6), 2)
    ELSE 0
  END AS run_rate,
  m.status
FROM innings i
JOIN matches m ON i.match_id = m.id
ORDER BY m.match_id, i.innings_no;

-- ============================================================
-- LEADERBOARD: Top Run Scorers (across all matches)
-- ============================================================
CREATE VIEW top_run_scorers AS
SELECT
  p.id AS player_id,
  p.name,
  COUNT(DISTINCT b.innings_id) AS innings_played,
  SUM(b.runs) AS total_runs,
  MAX(b.runs) AS highest_score,
  COUNT(CASE WHEN b.is_wicket THEN 1 END) AS dismissals,
  ROUND(SUM(b.runs)::DECIMAL / NULLIF(COUNT(CASE WHEN b.is_wicket THEN 1 END), 0), 2) AS average
FROM balls b
JOIN players p ON b.batsman_id = p.id
GROUP BY p.id, p.name
ORDER BY total_runs DESC;

-- ============================================================
-- LEADERBOARD: Top Wicket Takers (across all matches)
-- ============================================================
CREATE VIEW top_wicket_takers AS
SELECT
  p.id AS player_id,
  p.name,
  COUNT(DISTINCT b.innings_id) AS innings_bowled,
  COUNT(CASE WHEN b.is_wicket THEN 1 END) AS wickets,
  SUM(b.runs) AS runs_conceded,
  ROUND(COUNT(CASE WHEN b.is_wicket THEN 1 END)::DECIMAL / NULLIF(COUNT(DISTINCT b.innings_id), 0), 2) AS wickets_per_innings,
  ROUND(SUM(b.runs)::DECIMAL / NULLIF(COUNT(CASE WHEN b.is_wicket THEN 1 END), 0), 2) AS average
FROM balls b
JOIN players p ON b.bowler_id = p.id
GROUP BY p.id, p.name
ORDER BY wickets DESC;

-- ============================================================
-- APP SETTINGS (key-value config, e.g. scorer_pin)
-- ============================================================
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_matches_match_id ON matches(match_id);
CREATE INDEX idx_balls_match_id ON balls(match_id);
CREATE INDEX idx_balls_innings_id ON balls(innings_id);
CREATE INDEX idx_balls_batsman ON balls(batsman_id);
CREATE INDEX idx_balls_bowler ON balls(bowler_id);

-- ============================================================
-- Row Level Security (RLS) — enable for public access
-- ============================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE balls ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for all tables
CREATE POLICY "anon_all_players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_innings" ON innings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_balls" ON balls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
