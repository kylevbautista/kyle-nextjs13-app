# Architecture Document

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive

---

## Executive Summary

Kyle's Anime Tracking App is a full-stack Next.js 16 application using the App Router pattern. It combines static site generation (SSG) with incremental static regeneration (ISR) for anime browsing pages, REST API routes for watchlist CRUD, and OAuth-based authentication via NextAuth.js. Data is stored in MongoDB with an embedded document strategy for user watchlists. The frontend uses a component-based architecture with Zustand for global state, SWR for server-state caching, and React Context for local UI state.

---

## Technology Stack

| Category | Technology | Version | Justification |
|----------|-----------|---------|---------------|
| Framework | Next.js | 16.1.1 | App Router for SSG/ISR, API routes, image optimization |
| UI Library | React | 19.2.3 | Concurrent features, server components |
| Language | TypeScript | 5.0.4 | Type safety across full stack |
| Styling | Tailwind CSS | 3.2.2 | Rapid UI development, custom responsive breakpoints |
| Database | MongoDB | 4.13.0 | Flexible schema for embedded anime documents |
| ODM | Mongoose | 6.8.1 | Schema validation, model definitions |
| Auth | NextAuth.js | 4.24.5 | Multi-provider OAuth, MongoDB session adapter |
| Global State | Zustand | latest | Lightweight store for filters and list state |
| Server Cache | SWR | 2.0.0 | Stale-while-revalidate for API data |
| External API | AniList GraphQL | — | Primary anime data source |
| Hosting | Vercel | — | Zero-config Next.js deployment |
| Analytics | Vercel Analytics | 1.0.0 | Core Web Vitals monitoring |
| Notifications | React Hot Toast | 2.4.0 | User feedback for list operations |
| Loading | NProgress | 0.2.0 | Page transition loading bar |

---

## Architecture Pattern

**Pattern:** Component-Based Full-Stack Monolith with SSG/ISR

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (Hosting)                      │
├──────────────┬──────────────────┬───────────────────────┤
│  Static Pages │  API Routes       │  Auth Handler         │
│  (SSG + ISR)  │  (Serverless)     │  (NextAuth)           │
│               │                   │                       │
│  /anime/*     │  /api/anime-list  │  /api/auth/[...next]  │
│  /topanime    │  /api/anime-list/ │                       │
│  /            │     bulk, user/*  │  Providers:           │
│               │                   │  GitHub, Twitter,     │
│               │                   │  Google               │
├──────────────┴──────────────────┴───────────────────────┤
│                    Next.js App Router                     │
│                                                          │
│  Server Components → fetch data                          │
│  Boundary Components → client interactivity              │
│  API Routes → serverless functions                       │
├──────────────────────────────────────────────────────────┤
│                    Data Layer                             │
│                                                          │
│  ┌─────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ MongoDB  │    │ AniList API  │    │ SWR Cache      │  │
│  │ (Users,  │    │ (GraphQL)    │    │ (Client-side)  │  │
│  │ Sessions)│    │              │    │                │  │
│  └─────────┘    └──────────────┘    └────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Rendering Strategy

| Route | Strategy | Revalidation | Notes |
|-------|----------|-------------|-------|
| `/anime/[year]/[season]` | SSG + ISR | 60 seconds | Pre-built for 24+ season combinations |
| `/topanime` | SSG + ISR | 60 seconds | Top anime rankings |
| `/` | SSG | — | Static landing page |
| `/mylist/[user]` | SSR | — | Requires session, dynamic per user |
| `/user/[user]` | SSR | — | Dynamic user profile |
| `/auth/signin` | SSR | — | Dynamic sign-in page |

**Build Optimization:** Single-threaded SSG (`workerThreads: false, cpus: 1`) prevents AniList API rate limiting during build.

---

## Data Architecture

### Storage Strategy: Embedded Documents

User watchlist data is **embedded** within user documents (denormalized):

```
User Document
├── Profile fields (name, email, image)
└── following: AnimeInfo[]   ← Full anime data + user progress
```

**Trade-offs:**
- **Pro:** Fast reads for individual user lists (single document fetch)
- **Pro:** No joins needed for watchlist display
- **Con:** Anime data is duplicated across users
- **Con:** Updating shared anime metadata requires updating all copies

### Collections
- `users` — User profiles with embedded anime watchlists
- `sessions` — NextAuth session records
- `accounts` — NextAuth OAuth account links

### Connection Management
- Connection pooling via `dbConnect.ts` with global cache
- `MongoClient` singleton promise pattern for serverless environments

---

## State Management Architecture

```
┌──────────────────────────────────────────────┐
│               State Layers                     │
├──────────────────────────────────────────────┤
│                                                │
│  1. SERVER STATE (SWR)                        │
│     - Anime list data from AniList API        │
│     - User watchlist from MongoDB             │
│     - Optimistic mutations with cache update  │
│     - 5000ms refresh interval for watchlist   │
│                                                │
│  2. GLOBAL CLIENT STATE (Zustand)             │
│     - List filter: All/Watching/Completed/... │
│     - Filter by: day, season, year, status    │
│     - List type counts per category           │
│     - DevTools middleware for debugging        │
│                                                │
│  3. LOCAL UI STATE (React Context)            │
│     - HydrationProvider: client hydration     │
│     - HeaderProvider: season/year selection    │
│     - SessionProvider: NextAuth session        │
│                                                │
│  4. LOCAL STORAGE                              │
│     - listRefreshTime: prevents redundant     │
│       API calls by tracking last update       │
│                                                │
└──────────────────────────────────────────────┘
```

---

## Authentication Architecture

```
User → OAuth Provider (GitHub/Twitter/Google)
  → NextAuth Callback
  → MongoDB Session Created (accounts + sessions collections)
  → Session Object: { user: { name, email, image }, objectId: "<MongoDB _id>" }
  → Protected API routes check getServerSession()
  → Client components access session via useSession()
```

**Key Decision:** `objectId` is added to the session via NextAuth callbacks, allowing API routes to directly query the user's MongoDB document without an additional email lookup.

---

## Performance Architecture

### Static Generation
- 24+ pre-built season pages covering ~5 years of anime
- ISR with 60-second revalidation for fresh data
- Automatic redirects from `/anime` to current season

### Client-Side Optimizations
- **Lazy Loading:** Intersection Observer loads 2 items at a time as user scrolls
- **Prefetching:** Adjacent seasons pre-loaded before user navigates
- **Optimistic Updates:** SWR cache mutations for instant watchlist feedback
- **Rate Limiting:** AniList API client monitors remaining calls, auto-throttles

### Build Optimizations
- Single-threaded SSG prevents API rate limiting
- SWC minification enabled
- CSS optimization (experimental)
- Image optimization for anilist.co domain

---

## Testing Strategy

**Current State:** No automated tests found in the project.

**Test Patterns Available:**
- Framework supports `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx`
- Jest/React Testing Library compatible (not configured)
- No CI/CD test pipeline detected

---

## Deployment Architecture

| Component | Detail |
|-----------|--------|
| Platform | Vercel |
| Deploy Trigger | Git push to main |
| Build Command | `npm run build` (includes Tailwind compilation) |
| Runtime | Node.js 22.x |
| Serverless Functions | API routes auto-deployed as edge/serverless |
| Static Assets | CDN-distributed via Vercel Edge Network |
| Analytics | Vercel Analytics for Core Web Vitals |

### Required Environment Variables
```
GRAPHQL_ANILIST, NEXT_PUBLIC_GRAPHQL_ANILIST
MONGODB_URI
NEXTAUTH_URL, NEXTAUTH_SECRET
GITHUB_ID, GITHUB_SECRET
TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

---

## Code Conventions

- **File Naming:** PascalCase for components (`PageBase.tsx`), camelCase for utilities (`getAniListData.ts`)
- **Component Pattern:** Server component → Boundary (client) → Feature component
- **State Updates:** Prefer SWR `mutate()` for server-state, Zustand actions for client-state
- **Error Handling:** Try-catch in API routes, toast notifications on client
- **Imports:** `@/*` path alias resolves to project root
