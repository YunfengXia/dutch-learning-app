# Dutch/Flemish Learning App

A modern full-stack vocabulary trainer for Dutch/Flemish learning.

## Features

- Manual word entry with automatic enrichment (translation, part of speech, article)
- Import document flow (.txt/.pdf/.docx) with fast extraction and batch add
- Website scraping and Dutch word mapping
- Dashboard with filtering, category tagging, and bulk operations
- Flashcards with auto-pronunciation, keyboard shortcuts, and reinforced review mode
- Listening mode with grouped practice and voice controls

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Backend | Node.js + Express |
| NLP/Data Enrichment | woordenlijst.org + Wiktionary fallback |
| Web scraping | Cheerio + axios |

## Local Development

1. Install dependencies:

	npm install
	npm run install:all

2. Run both apps:

	npm run dev

3. Open:

	- Client: http://localhost:5173
	- API: http://localhost:4000

## Publish To Public Internet

This repo is ready for a common split deployment: API on Render + frontend on Vercel.

### 1) Deploy API (Render)

1. Push this repo to GitHub.
2. In Render, create a new Web Service from the repo.
3. Configure:
	- Root Directory: server
	- Build Command: npm install
	- Start Command: npm start
4. Set environment variable:
	- ALLOWED_ORIGINS=https://your-frontend.vercel.app
5. Deploy and copy your API URL, for example:
	- https://your-server.onrender.com

Note: A sample Render blueprint is included in [render.yaml](render.yaml).

### 2) Deploy Client (Vercel)

1. In Vercel, import the same GitHub repo.
2. Set project root to client.
3. Add env var:
	- VITE_API_BASE_URL=https://your-server.onrender.com/api
4. Deploy.

Note: SPA rewrite config is included in [client/vercel.json](client/vercel.json).

### 3) Wire CORS

After Vercel gives you a final frontend URL, update Render env var:

ALLOWED_ORIGINS=https://your-frontend.vercel.app

If you have multiple frontend domains, comma-separate them.

### 4) Smoke Test In Production

- Add a word manually
- Import a small text and confirm words are added
- Open Flashcards and verify auto-pronunciation
- Open Listening and verify speech playback

## Important Note

Current storage is in-memory. Data resets when the server restarts/redeploys.
For persistent production usage, add a database (SQLite/Postgres) in a next step.
