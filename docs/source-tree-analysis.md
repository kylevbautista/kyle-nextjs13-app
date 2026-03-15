# Source Tree Analysis

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive

---

## Annotated Directory Tree

```
kyle-nextjs13-app/
├── @types/                          # TypeScript type definitions
│   ├── global.d.ts                  #   Global Mongoose cache types
│   ├── graphql.d.ts                 #   AniList GraphQL response types
│   └── next-auth.d.ts               #   NextAuth session extension (objectId)
│
├── app/                             # Next.js App Router (ENTRY POINT)
│   ├── layout.tsx                   #   Root layout — SessionProvider, NavBar, Analytics
│   ├── (home)/                      #   Landing page (route group)
│   │   └── page.tsx                 #     Home page component
│   │
│   ├── anime/[...anime]/            #   Seasonal anime browsing (catch-all route)
│   │   ├── page.tsx                 #     SSG page — fetches AniList data per season
│   │   └── Boundary.tsx             #     Client boundary — renders PageBase
│   │
│   ├── mylist/[...user]/            #   User watchlist (base64-encoded email param)
│   │   ├── page.tsx                 #     Server component — fetches session
│   │   └── Boundary.tsx             #     Client boundary — renders MyList PageBase
│   │
│   ├── topanime/                    #   Top-rated anime page
│   │   ├── page.tsx                 #     SSG page — fetches top anime from AniList
│   │   └── Boundary.tsx             #     Client boundary
│   │
│   ├── user/[...user]/              #   User profile page
│   │   ├── page.tsx                 #     Server component
│   │   └── Boundary.tsx             #     Client boundary with filtering
│   │
│   ├── auth/signin/                 #   Custom sign-in page
│   │   └── page.tsx                 #     Renders provider buttons
│   │
│   └── api/                         #   API Routes (REST endpoints)
│       ├── auth/[...nextauth]/      #     NextAuth handler (GitHub, Twitter, Google)
│       │   └── route.ts
│       ├── anime-list/              #     Watchlist CRUD
│       │   ├── route.ts             #       POST (add) / DELETE (remove)
│       │   ├── bulk/                #       POST bulk operations
│       │   │   └── route.ts
│       │   ├── [animeId]/
│       │   │   └── user-data/       #       GET user progress for specific anime
│       │   │       └── route.ts
│       │   └── user/[userParam]/    #       GET user's full anime list
│       │       └── route.ts
│       └── top-anime/               #     Top anime data endpoint
│           └── route.ts
│
├── components/                      # React components (organized by feature)
│   ├── animev3/                     #   Main anime display system
│   │   ├── PageBase.tsx             #     ★ Primary grid — lazy loading, sorting, prefetch
│   │   ├── AnimeInfoGrid.tsx        #     ★ Anime card — countdown, actions, details
│   │   ├── layoutSelector/          #     Season/year header selector
│   │   │   ├── HeaderProvider.tsx   #       Context provider for season/year state
│   │   │   └── HeaderSelector.tsx   #       Dropdown UI for season/year selection
│   │   └── utils/                   #     Custom hooks and helpers
│   │       ├── useLazyLoad.tsx      #       Intersection Observer lazy loading
│   │       ├── usePrefetch.tsx      #       Adjacent season prefetching
│   │       ├── useInterval.tsx      #       Safe setInterval hook
│   │       ├── getAniListData.ts    #       AniList API client with rate limiting
│   │       ├── fetchWithTimeout.ts  #       Request timeout wrapper
│   │       ├── timeStampHelpers.ts  #       Unix timestamp utilities
│   │       └── routeChecker.ts      #       URL validation helper
│   │
│   ├── mylist/                      #   Watchlist management
│   │   ├── PageBase.tsx             #     Watchlist grid with filtering
│   │   ├── layout/                  #     Header components
│   │   │   ├── HeaderProvider.tsx   #       Watchlist header context
│   │   │   └── HeaderSelector.tsx   #       Filter/sort controls
│   │   └── utils/                   #     Utilities
│   │       ├── sortUtils.ts         #       List sorting functions
│   │       └── userListUtils.ts     #       User list data helpers
│   │
│   ├── auth/                        #   Authentication components
│   │   └── SignIn.tsx               #     Sign-in page component
│   │
│   └── common/                      #   Shared/reusable components
│       ├── NavBar.tsx               #     ★ Main navigation bar
│       ├── LogInBox.tsx             #     Auth dropdown with session state
│       ├── HydrationProvider.tsx    #     Client-side hydration context
│       ├── AnimeBar.tsx             #     Season quick-links bar
│       ├── Card.tsx                 #     Card layout primitive
│       ├── Grid.tsx                 #     Grid layout primitive
│       └── Button.tsx               #     Button primitive
│
├── server/                          # Backend logic
│   ├── auth/
│   │   └── index.ts                 #   ★ NextAuth config — providers, adapter, callbacks
│   ├── mongodb/
│   │   ├── models/
│   │   │   ├── User/
│   │   │   │   └── index.ts         #     User schema (name, email, following[])
│   │   │   └── AnimeInfo/
│   │   │       └── index.ts         #     ★ Anime schema (deeply nested, 50+ fields)
│   │   └── lib/
│   │       ├── dbConnect.ts         #     MongoDB connection pooling
│   │       └── mongodb.ts           #     MongoClient promise singleton
│   └── lib/
│       └── (shared server utils)
│
├── stores/                          # State management
│   └── user/
│       └── userStore.ts             #   Zustand store — filters, list state, counts
│
├── styles/                          # Styling
│   ├── globals.css                  #   Global styles, Tailwind directives
│   └── dist.css                     #   Compiled Tailwind output
│
├── public/                          # Static assets
│   └── assets/
│       ├── Monkey_D_Luffy.png
│       ├── animeSprites.png
│       ├── cidkagenou.gif
│       ├── pepe-the-frog-dancing.gif
│       └── star-32.png
│
├── package.json                     # Dependencies, scripts, Node 22.x
├── tsconfig.json                    # TypeScript config — strict, ES5 target, @/* alias
├── next.config.js                   # Next.js — SSG config, redirects, image domains
├── tailwind.config.js               # Custom breakpoints, animations
├── postcss.config.js                # Tailwind + Autoprefixer
├── eslint.config.mjs                # ESLint 9 flat config
└── next-env.d.ts                    # Next.js TypeScript env
```

---

## Critical Folders

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `app/` | Next.js App Router — all pages and API routes | `page.tsx`, `route.ts`, `layout.tsx` |
| `app/api/` | REST API endpoints for watchlist CRUD and auth | `route.ts` files |
| `components/animev3/` | Core anime display system with lazy loading | `PageBase.tsx`, `AnimeInfoGrid.tsx` |
| `components/common/` | Shared UI primitives and navigation | `NavBar.tsx`, `LogInBox.tsx` |
| `server/auth/` | NextAuth configuration with 3 OAuth providers | `index.ts` |
| `server/mongodb/models/` | Mongoose schemas for User and AnimeInfo | `User/index.ts`, `AnimeInfo/index.ts` |
| `server/mongodb/lib/` | MongoDB connection management | `dbConnect.ts`, `mongodb.ts` |
| `stores/user/` | Zustand global state for filters and list tracking | `userStore.ts` |

---

## Entry Points

| Entry Point | Path | Description |
|-------------|------|-------------|
| App Root Layout | `app/layout.tsx` | Root layout wrapping all pages with SessionProvider, NavBar, Analytics |
| Home Page | `app/(home)/page.tsx` | Landing page |
| Anime Browse | `app/anime/[...anime]/page.tsx` | SSG seasonal anime pages |
| API Auth | `app/api/auth/[...nextauth]/route.ts` | NextAuth authentication handler |
| API Watchlist | `app/api/anime-list/route.ts` | Watchlist add/remove endpoints |
| DB Connection | `server/mongodb/lib/dbConnect.ts` | MongoDB connection pooling entry |
