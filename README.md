# Cricket Scorer  : https://umeshajay.github.io/cricket-scorer/

A single-file cricket scoring web app with light/dark mode, ball-by-ball tracking, 2-innings support, match reports with charts, and WhatsApp share.

## Architecture

```
┌─────────────────────────────────────┐
│  scorer.html                        │
│  (Vanilla JS + CSS custom props)    │
│                                     │
│  • Ball-by-ball scoring             │
│  • 2-innings match tracking         │
│  • Team & player management         │
│  • Match log & undo                 │
│  • Reports with Chart.js charts     │
│  • Screenshot via html2canvas       │
│  • WhatsApp share                   │
│  • Light/dark theme toggle          │
│  • GitHub auto-sync (git push)      │
└──────────────┬──────────────────────┘
               │ localStorage
               ▼
┌─────────────────────────────────────┐
│  cricket-scorer-data.json           │
│  (Git-tracked JSON blob)            │
└──────────────┬──────────────────────┘
               │ git push (via JS)
               ▼
┌─────────────────────────────────────┐
│  GitHub Pages                       │
│  https://umeshajay.github.io/       │
│  cricket-scorer/scorer              │
└─────────────────────────────────────┘
```

## Live Demo

**[https://umeshajay.github.io/cricket-scorer/scorer](https://umeshajay.github.io/cricket-scorer/scorer)**

## Features

- **Scoring Pad** — Tap 0, 1, 2, 3, 4, 6, Wide, No-Ball, Wicket, End Over
- **Smart workflows** — Wide/No-Ball prompt for follow-up runs; Wicket prompts dismissal type
- **2 Innings** — First innings limit at 5 overs, auto-switch; second innings target chase
- **Team Management** — Create, edit, delete teams with player rosters
- **Match Log** — Scrollable ball-by-ball record with color-coded entries
- **Undo** — Revert the last ball
- **Home View** — All matches with scorecards, filter by status
- **Reports** — Worm graph, run-rate progression, Manhattan chart (wickets per over)
- **WhatsApp Share** — Share completed match report as text via WhatsApp
- **Screenshots** — Download report as PNG via html2canvas
- **Light/Dark Mode** — Toggle in header, persisted to localStorage
- **Auto-sync** — Data saved to `cricket-scorer-data.json` and committed/pushed to GitHub

## Folder Structure

```
cricket-scorer/
├── scorer.html                 # Main app (everything in one file)
├── index.html                  # Redirects to /scorer
├── cricket-scorer-data.json    # Match data (auto-synced)
├── README.md
├── .gitignore
├── database/
│   └── schema.sql              # Legacy Supabase schema (reference only)
└── frontend/                   # Legacy Next.js dashboard (not used)
```

## Deployment

Deploy by pushing `main` branch to GitHub — the repo is configured for GitHub Pages:

```
https://umeshajay.github.io/cricket-scorer/scorer
```

No build step, no environment variables, no database setup needed.

## Usage

1. Open the app → tap **New Match** to create teams and set overs
2. Tap **Start Match** → the scoring pad appears
3. Score runs, extras, and wickets — each tap updates the scoreboard
4. After 5 overs, tap **End Innings** → second innings begins
5. When the chase is done, tap **Match Complete** → view the report
6. Share via **WhatsApp** or download the report screenshot

## Data Storage

All data is stored in `cricket-scorer-data.json` tracked in this repo. The app uses `localStorage` as a cache and syncs by committing/pushing changes to GitHub automatically.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| UI | Vanilla JS + CSS Custom Properties (no frameworks) |
| Charts | Chart.js CDN |
| Screenshots | html2canvas CDN |
| Storage | localStorage + JSON file |
| Hosting | GitHub Pages |
