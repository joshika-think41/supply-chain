# Supply Chain Intelligence Dashboard

Consumer-electronics operations cockpit with seeded data, dynamic risk scoring, simulations, news enrichment, SQLite snapshots, and Gemini-powered executive summaries.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:8787`.

`GEMINI_API_KEY` and `NEWS_API_KEY` are optional. In their absence, the dashboard remains fully functional using local news fixtures and evidence-based summary templates.

## Vercel

The deployed demo uses Vercel serverless functions and keeps its latest dashboard snapshot in memory. Configure `GEMINI_API_KEY` and `NEWSDATA_API_KEY` in Vercel before deployment; the original Express + SQLite server remains for local development.
