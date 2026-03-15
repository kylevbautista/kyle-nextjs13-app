# Project Overview — Kyle's Anime Tracking App

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive | **Language:** English

---

## Executive Summary

Kyle's Anime Tracking App is a production-grade anime discovery and watchlist management platform hosted at **kylevb.com**. Built with Next.js 16 and the App Router, it leverages server-side rendering and incremental static regeneration to deliver fast, SEO-friendly anime browsing by season. Users authenticate via OAuth (GitHub, Twitter, Google), manage personal watchlists stored in MongoDB, and enjoy real-time episode countdown timers powered by the AniList GraphQL API.

---

## Technology Stack Summary

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Framework | Next.js | 16.1.1 | App Router, SSG/ISR |
| UI Library | React | 19.2.3 | Concurrent features |
| Language | TypeScript | 5.0.4 | Strict mode |
| Styling | Tailwind CSS | 3.2.2 | Custom breakpoints |
| Database | MongoDB | 4.13.0 | via Mongoose 6.8.1 |
| Auth | NextAuth.js | 4.24.5 | GitHub, Twitter, Google |
| State | Zustand | (latest) | DevTools middleware |
| Data Fetching | SWR | 2.0.0 | Stale-while-revalidate |
| External API | AniList GraphQL | — | Primary anime data source |
| Hosting | Vercel | — | Automatic deploys |
| Analytics | Vercel Analytics | 1.0.0 | Performance monitoring |

---

## Architecture Classification

| Attribute | Value |
|-----------|-------|
| Repository Type | Monolith |
| Architecture Pattern | Component-based with API routes |
| Rendering Strategy | SSG + ISR (revalidate: 60s) |
| API Style | REST (Next.js API Routes) + GraphQL client (AniList) |
| Auth Pattern | OAuth 2.0 via NextAuth with MongoDB sessions |
| State Pattern | Zustand (global) + SWR (server cache) + React Context (local) |

---

## Repository Structure

This is a **single-part monolith** — all frontend, backend, and database logic lives in one codebase under the Next.js App Router convention.

- **Frontend:** `app/`, `components/`, `styles/`
- **Backend:** `app/api/`, `server/`
- **State:** `stores/`
- **Types:** `@types/`
- **Static Assets:** `public/`

---

## Key Features

1. **Seasonal Anime Browsing** — Browse anime by year and season with automatic current-season detection
2. **Live Episode Countdowns** — 1-second precision timers for upcoming episodes
3. **Personal Watchlist** — Add/remove anime, track progress, score, and status
4. **Multi-Provider Auth** — GitHub, Twitter, Google OAuth sign-in
5. **Predictive Prefetching** — Adjacent seasons prefetched before navigation
6. **Optimistic Updates** — Instant UI feedback via SWR cache manipulation
7. **Rate Limit Protection** — Monitors AniList API headers and auto-throttles
8. **Top Anime Rankings** — Browse highest-rated anime across all seasons

---

## Related Documentation

- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
