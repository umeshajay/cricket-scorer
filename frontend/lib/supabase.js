import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// ── Players ────────────────────────────────────────────

export async function fetchPlayers() {
  const { data, error } = await supabase.from('players').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function addPlayer(name) {
  const { data, error } = await supabase.from('players').insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlayer(id) {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

// ── Matches ────────────────────────────────────────────

export async function fetchMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMatchById(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('match_id', matchId)
    .single();
  if (error) throw error;
  return data;
}

export async function createMatch(matchObj) {
  const { data, error } = await supabase.from('matches').insert(matchObj).select().single();
  if (error) throw error;
  return data;
}

// ── Innings ────────────────────────────────────────────

export async function fetchInnings(matchId) {
  const { data, error } = await supabase
    .from('innings')
    .select('*')
    .eq('match_id', matchId)
    .order('innings_no');
  if (error) throw error;
  return data;
}

// ── Balls ──────────────────────────────────────────────

export async function fetchBalls(matchId) {
  const { data, error } = await supabase
    .from('ball_by_ball')
    .select('*')
    .eq('match_id', matchId)
    .order('over_number');
  if (error) throw error;
  return data;
}

// ── Leaderboards ───────────────────────────────────────

export async function fetchTopRunScorers() {
  const { data, error } = await supabase.from('top_run_scorers').select('*');
  if (error) throw error;
  return data;
}

export async function fetchTopWicketTakers() {
  const { data, error } = await supabase.from('top_wicket_takers').select('*');
  if (error) throw error;
  return data;
}
