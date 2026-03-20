# ◈ TradeLens — Private Trading Journal

A production-grade trading journal web app with Binance API integration, detailed analytics, AI analysis, calendar P&L view, and notes/journaling — all locked to your Supabase account.

---

## Features

- **Dashboard** — 11 KPI cards, equity curve, drawdown, monthly P&L, win/loss donuts, long/short breakdown, performance radar, hour/day heatmaps, symbol table
- **Trade Log** — Sortable/filterable table with pagination, CSV export, all trade fields
- **Advanced Analytics** — Rolling win rate, trade waterfall, fee impact, leverage breakdown, scatter plots, 24-hour heatmap
- **P&L Calendar** — Monthly heatmap calendar, click any day to see trades, daily streak, month summary
- **Symbol Analysis** — Per-symbol cards with mini equity curves, deep-dive detail panel
- **Journal / Notes** — Rich notes with mood tracking, tags, date/symbol linking — saved to Supabase or localStorage
- **AI Verdict** — Free Claude-powered analysis with 6 quick prompts + custom queries
- **Settings** — Binance connection, auth status, export, deploy guide

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env

# 3. Run dev server (works without Supabase in demo mode)
npm run dev
```

Open http://localhost:5173

---

## Setup Authentication (Private Access)

### 1. Create Supabase project
Go to https://supabase.com → New Project (free tier is fine)

### 2. Get credentials
Dashboard → Settings → API → copy:
- Project URL → `VITE_SUPABASE_URL`
- anon public key → `VITE_SUPABASE_ANON_KEY`

### 3. Create database tables
Go to Dashboard → SQL Editor → run:

```sql
-- Trade notes
create table trade_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  trade_id text,
  date date,
  symbol text,
  title text,
  body text,
  mood text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table trade_notes enable row level security;
create policy "Users own their notes" on trade_notes
  for all using (auth.uid() = user_id);

-- API keys (optional)
create table api_keys (
  user_id uuid primary key references auth.users,
  api_key text,
  label text,
  created_at timestamptz default now()
);
alter table api_keys enable row level security;
create policy "Users own their keys" on api_keys
  for all using (auth.uid() = user_id);
```

### 4. Create your account
Dashboard → Authentication → Users → Add user
Enter your email and password (this is the ONLY account that can log in)

### 5. Set Site URL (after deploying)
Dashboard → Authentication → URL Configuration → Site URL → set to your deployed URL

---

## Connect Real Binance Data

Binance requires HMAC-SHA256 signing for API calls, which **must be done server-side** for security (you can't put your API secret in frontend code).

### Option A: Netlify Functions (recommended)

Create `netlify/functions/binance.js`:
```javascript
const crypto = require('crypto')

exports.handler = async (event) => {
  const { apiKey, apiSecret } = JSON.parse(event.body)
  const timestamp = Date.now()
  const query = `timestamp=${timestamp}&limit=1000`
  const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex')

  const res = await fetch(
    `https://api.binance.com/api/v3/myTrades?${query}&signature=${signature}`,
    { headers: { 'X-MBX-APIKEY': apiKey } }
  )
  const data = await res.json()
  return { statusCode: 200, body: JSON.stringify(data) }
}
```

Then in `src/hooks/useTrades.js`, uncomment the fetch call pointing to `/.netlify/functions/binance`.

### Option B: Vercel Edge Function
Similar approach using Vercel API routes in `/api/binance.js`.

---

## Free Hosting

### Netlify (drag & drop — easiest)
```bash
npm run build
# Drag the /dist folder to netlify.com/drop
# Then add env vars in Site Settings → Environment Variables
```

### Vercel (CLI)
```bash
npm install -g vercel
vercel --prod
# Add env vars in vercel.com dashboard → Settings → Environment Variables
```

### After deploying
1. Copy your live URL
2. Supabase → Auth → URL Configuration → Site URL → paste URL
3. Test login — only your Supabase account works

---

## File Structure

```
tradelens/
├── src/
│   ├── App.jsx                 # Root component + routing
│   ├── main.jsx                # React entry point
│   ├── lib/
│   │   ├── supabase.js         # Supabase client + DB helpers + SQL setup
│   │   ├── data.js             # Mock generator, stats engine, formatters
│   │   └── theme.js            # Design tokens + color helpers
│   ├── hooks/
│   │   ├── useAuth.jsx         # Auth context provider
│   │   └── useTrades.js        # Trade data + Binance connection
│   ├── components/
│   │   ├── Layout.jsx          # Sidebar nav layout
│   │   └── UI.jsx              # Reusable components (Card, KpiCard, Badge, etc.)
│   └── pages/
│       ├── LoginPage.jsx       # Auth gate
│       ├── DashboardPage.jsx   # Main overview with all charts
│       ├── TradesPage.jsx      # Full trade log table
│       ├── AnalyticsPage.jsx   # Deep analytics
│       ├── CalendarPage.jsx    # P&L calendar heatmap
│       ├── SymbolsPage.jsx     # Per-symbol analysis
│       ├── NotesPage.jsx       # Trading journal with DB
│       ├── AIPage.jsx          # Claude AI analysis
│       └── SettingsPage.jsx    # Binance + auth + export
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## Tech Stack

- **React 18** + Vite — fast, lightweight frontend
- **Recharts** — all charts and visualizations
- **Supabase** — auth + Postgres database (free tier)
- **Claude API** — AI analysis (free via claude.ai artifacts)
- **Netlify / Vercel** — free hosting

---

## Security Notes

- Supabase Row Level Security (RLS) ensures only your user_id can read/write data
- API keys are never stored in code — only in environment variables
- Binance secret key is never sent to the frontend — only processed server-side
- The app has no public registration — only manually-created Supabase accounts can log in
