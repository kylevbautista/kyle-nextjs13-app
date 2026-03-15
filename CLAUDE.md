# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Anime discovery and watchlist platform (kylevb.com). Users browse seasonal anime via AniList GraphQL API, authenticate with OAuth, and manage personal watchlists stored in MongoDB.

## Commands

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build (single-threaded SSG to avoid AniList rate limits)
npm run lint         # ESLint with Next.js core-web-vitals
npm run tw:dev       # Tailwind watch + Next.js dev server
npm run tw:build     # Tailwind compile + Next.js build
npm run clean        # Remove node_modules and .next
```

No test suite is configured.

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · MongoDB/Mongoose · NextAuth · Zustand · SWR · Tailwind CSS

**Rendering:** SSG + ISR (60s revalidate) for anime pages. SSR for user-specific pages (mylist, profile). Build is forced single-threaded (`workerThreads: false, cpus: 1` in next.config.js) to prevent AniList API rate limiting.

**Server/Client Boundary Pattern:** Server components (`page.tsx`) fetch data → pass to client `Boundary.tsx` → renders interactive feature components. This is the core architectural pattern throughout.

**State layers:**
- SWR — server-state cache with optimistic mutations (5s refresh for watchlist)
- Zustand (`stores/user/userStore.ts`) — client-side filters and list counts
- React Context — hydration state, season/year selection, NextAuth session

**Auth:** NextAuth with GitHub/Twitter/Google providers. MongoDB adapter for sessions. Custom callback adds `session.objectId` (MongoDB `_id`). Protected API routes use `getServerSession()`.

**Database:** MongoDB with embedded document strategy — anime data is denormalized into each user's `following[]` array. No migration system; schema changes via Mongoose definitions. Models use try-catch registration to handle Next.js hot reload.

**Path alias:** `@/*` maps to project root.

## Key Directories

- `app/` — Pages and API routes (App Router)
- `app/api/anime-list/` — Watchlist CRUD endpoints
- `components/animev3/` — Core anime display (PageBase, AnimeInfoGrid, custom hooks)
- `components/mylist/` — Watchlist UI with filtering
- `components/common/` — Shared components (NavBar, LogInBox, HydrationProvider)
- `server/auth/` — NextAuth config
- `server/mongodb/models/` — Mongoose schemas (User with embedded AnimeInfo)
- `server/mongodb/lib/` — DB connection pooling (`dbConnect.ts`)

## Important Patterns

- `getAniListData.ts` monitors `x-ratelimit-remaining` header and auto-throttles (1.5s sleep when <20 remaining)
- `useLazyLoad` hook uses Intersection Observer to load 2 items at a time on scroll
- `usePrefetch` pre-loads adjacent season routes for instant navigation
- Anime cards have live countdown timers (1-second intervals via `useInterval` hook)
- SWR `mutate()` with `populateCache` for optimistic watchlist updates
- User watchlist param is base64url-encoded email

## Environment Variables

Requires: `GRAPHQL_ANILIST`, `NEXT_PUBLIC_GRAPHQL_ANILIST`, `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`, `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Project Documentation

Comprehensive docs generated via BMAD Document Project workflow live in `docs/`:

- `docs/index.md` — Master index and navigation
- `docs/project-overview.md` — Executive summary, tech stack, key features
- `docs/architecture.md` — Architecture patterns, rendering strategy, state management, data flow
- `docs/source-tree-analysis.md` — Annotated directory tree, critical folders, entry points
- `docs/component-inventory.md` — All 27 React components, hooks, and utilities cataloged
- `docs/api-contracts.md` — REST endpoints with request/response schemas, auth flow, AniList integration
- `docs/data-models.md` — MongoDB schemas, embedded document design, collections
- `docs/development-guide.md` — Prerequisites, setup, scripts, development patterns, troubleshooting

Start with `docs/index.md` for navigating the full documentation set.

## BMAD

This project uses the BMAD workflow system. Configuration in `_bmad/`, output in `_bmad-output/`.
