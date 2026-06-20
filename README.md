# 🏏 Cricket Scorer


## Architecture

```
┌──────────────────────────┐      ┌──────────────┐      ┌──────────────────────┐
│  (aiogram + FSM)         │◄────►│  (PostgreSQL) │◄────►│  (Next.js + Tailwind)│
│                          │      │              │      │                      │
│  Scoring pad inline kb   │      │  players     │      │  Live scorecard      │
│  Wide→follow-up runs     │      │  matches     │      │  Podium leaderboard  │
│  Wicket→dismissal type   │      │  innings     │      │  Team setup modal    │
│  Auto scorecard after    │      │  balls       │      │  Auto-refresh 5s     │
│  every tap               │      │  scorers     │      │                      │
└──────────────────────────┘      └──────────────┘      └──────────────────────┘
```

## Folder Structure

```
cricket-scorer/
├── README.md
├── .gitignore
├── database/
│   └── schema.sql              # Supabase schema + views + RLS
├── bot/
│   ├── main.py                 # aiogram entry point
│   ├── handlers.py             # FSM states + all callback/message handlers
│   ├── keyboards.py            # Inline keyboard builders
│   ├── database.py             # Supabase CRUD operations
│   ├── config.py               # Environment variables
│   ├── requirements.txt        # Python deps (aiogram, supabase)
│   └── .env.example            # Secrets template
├── frontend/
│   ├── package.json            # Next.js + Tailwind + Supabase
│   ├── next.config.js          # Static export for GitHub Pages
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── pages/
│   │   ├── _app.js             # Layout wrapper
│   │   ├── index.js            # Home with recent matches
│   │   ├── dashboard.js        # Live scorecard + ball-by-ball
│   │   ├── manage-players.js   # Add / remove players
│   │   ├── setup-match.js      # Create match with team builder
│   │   └── leaderboard.js      # Podium + table leaderboard
│   ├── components/
│   │   └── Layout.js           # Navbar + footer
│   ├── lib/
│   │   └── supabase.js         # Supabase client + helpers
│   ├── styles/
│   │   └── globals.css         # Tailwind + custom dark theme
│   └── public/
```

## Deployment

### 1. Supabase (Database)

1. Create an account at [supabase.com](https://supabase.com) and create a project
2. Open **SQL Editor**, paste `database/schema.sql`, and run it
3. Go to **Project Settings → API** and copy your `Project URL` and `anon/public key`

### 2. Frontend — GitHub Pages

```bash
cd frontend
cp .env.local.example .env.local   # set your Supabase URL + key
npm install
npm run build
# Deploy the `out/` folder to GitHub Pages
```

Set these environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

> If deploying to a sub-path (e.g. `https://user.github.io/cricket-scorer/`), uncomment `basePath` and `assetPrefix` in `next.config.js`.


1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token
2. Set the environment variables on your hosting platform:

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | From @BotFather |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase service_role or anon key |

Deploy `bot/` to [Render](https://render.com) (Web Service, Python 3, start command `python main.py`) or [Railway](https://railway.app).


Once the bot is running:

1. Send `/match M001` (or `/matches` to pick from a list)
2. The **Scoring Pad** appears:

```
[0] [1] [2] [3] [4] [6]
[Wide] [No-Ball] [Wicket] [End Over]
[Status] [Undo] [Change Match]
```

3. **Smart workflows:**

- Tap **Wide** → follow-up: `[+0] [+1] [+2] [+4] [Wicket] [Cancel]`
- Tap **No-Ball** → follow-up: `[+0] [+1] [+2] [+4] [Wicket] [Cancel]`
- Tap **Wicket** → follow-up: `[Bowled] [Caught] [Run Out] [LBW] [Stumped] [Cancel]`

4. After each tap, a scored `Scorecard Card` is shown automatically with the current score, overs, CRR, extras, and recent balls.

## Web Dashboard

- **Live Scorecard** — Select a match, see both team scores, auto-refreshes every 5s
- **Ball-by-Ball** — Color-coded balls (dot, 4, 6, wicket, wide, no-ball) grouped by over
- **Leaderboard** — Top 3 podium + full table for runs and wickets
- **Player Manager** — Add/remove players from a master list
- **Match Setup** — Choose overs (4-7), name teams, assign players via a builder

## Database Design (Modular)

| Column | Purpose |
|--------|---------|
| `balls.runs` | Runs off the bat → credited to batsman in `top_run_scorers` |
| `balls.extras` | Extra runs → team total, NOT credited to batsman |
| `balls.extra_type` | `wide`, `noball`, etc. → filters legal vs extra deliveries |
| `balls.is_wicket` | Did a wicket fall on this ball? |
| `balls.wicket_type` | Dismissal type (`bowled`, `caught`, `run_out`, `lbw`, `stumped`) |

### Attribution Rules

| Event | `runs` | `extras` | Ball counts? |
|-------|--------|----------|--------------|
| Legal dot | 0 | 0 | Yes |
| Legal 4 | 4 | 0 | Yes |
| Wicket | 0 | 0 | Yes |
| Wide | 0 | bat runs | No |
| Wide + wicket | 0 | 0 | No |
| No-ball | bat runs | 0 | No |
| No-ball + wicket | 0 | 0 | No |

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Bot | **aiogram 3** (Python) | FSM states for multi-step scoring (wide→runs, wicket→type) |
| Dashboard | **Next.js + Tailwind CSS** | Fast, modern, static-exportable to GitHub Pages |
| Database | **Supabase** | Realtime, free tier, perfect for live score updates |
