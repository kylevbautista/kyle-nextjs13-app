# Kyle's Anime Tracker 🎌

Browse every anime airing this season with live episode countdowns, search all of AniList, and keep a
list of what you're watching with progress, scores and dates.

**Live site:** [kylevb.com](https://kylevb.com)

## ✨ Features

- **Seasonal browser** (`/anime/<year>/<season>`): every TV show, movie, OVA and special premiering in a
  season, with live per-episode countdowns. Sort by countdown or popularity, step between seasons,
  and infinite scroll through AniList's pages. `/anime` always lands on the current season.
- **Search** (`/search`): any anime on AniList, including older seasons and ONAs.
- **My List** (`/user/<id>`): a full tracker. Statuses (Watching, Plan to Watch, Completed, Paused,
  Dropped), +1 episode, score, start/finish dates, filters and sorting. Shows auto-complete at the
  final episode. Lists are public by link; only you can edit yours.
- **Airing Schedule** (`/mylist/<id>`): the shows on your list that have an upcoming episode, grouped
  by weekday (Pacific Time).
- **Top Anime** (`/topanime`): MyAnimeList's ranking via Jikan, with a "Track" shortcut into search.
- **Google sign-in** via NextAuth, with sessions stored in MongoDB.

## 🛠️ Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 3.4 · NextAuth v4 · MongoDB
(native driver) · SWR · Vitest. Data comes from [AniList](https://anilist.co) (GraphQL) and
[Jikan](https://jikan.moe) (MyAnimeList). Hosted on Vercel.

## 🚦 Getting started

Prerequisites: Node.js 22, a MongoDB database (Atlas or local), and Google OAuth credentials.

```bash
npm ci
touch .env.local          # then fill it in (see below)
npm run dev               # http://localhost:3000
```

`.env.local`:

```env
MONGODB_URI=mongodb+srv://…
NEXTAUTH_SECRET=…                 # e.g. `openssl rand -base64 32`
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…

# Optional (these are the defaults)
GRAPHQL_ANILIST=https://graphql.anilist.co
NEXT_PUBLIC_GRAPHQL_ANILIST=https://graphql.anilist.co
JINKANV4_URL=https://api.jikan.moe/v4
NEXT_PUBLIC_JINKANV4_URL=https://api.jikan.moe/v4

# Optional extra providers (registered only when both values are set; the sign-in page shows Google)
GITHUB_ID=…
GITHUB_SECRET=…
TWITTER_CLIENT_ID=…
TWITTER_CLIENT_SECRET=…
```

### Scripts

```bash
npm run dev         # development server
npm run build       # production build (prerenders 28 season pages from AniList, so it needs network)
npm start           # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (next/core-web-vitals + React Compiler rules)
npm test            # Vitest unit tests
npm run check       # typecheck + lint + tests
```

## 🧭 How it works

- **Season pages** are ISR (regenerated at most every 5 minutes). Page 1 comes from AniList on the
  server; further pages load in the browser. If AniList fails, the last good page keeps being served.
- **Your list** is stored in your MongoDB user document as sanitized AniList snapshots plus your
  progress. Every write is validated and sanitized on the server, and descriptions are sanitized
  again when rendered.
- **Air dates stay fresh**: when a list is viewed and its snapshot is older than 10 minutes, the
  server re-fetches airing data for shows that haven't finished.
- **Rate limits**: AniList allows about 30 requests a minute, so the app queues and throttles its
  requests and the build prerenders on a single worker.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture: route map, data flows, data model and
conventions.

## 📄 License

This project is private and not licensed for public use.

## 🙏 Acknowledgments

[AniList](https://anilist.co) and [Jikan](https://jikan.moe) for the APIs, and Vercel for hosting.

Built with ❤️ by Kyle | [kylevb.com](https://kylevb.com)
