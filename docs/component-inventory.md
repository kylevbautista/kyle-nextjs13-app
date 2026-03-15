# Component Inventory

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive

---

## Overview

Components are organized by feature domain under `components/`. The project does not use a formal design system but has shared primitives in `components/common/`. All components are TypeScript React (`.tsx`).

---

## Anime Display System (`components/animev3/`)

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **PageBase** | `animev3/PageBase.tsx` | Client | Primary anime grid. Implements lazy loading via Intersection Observer, sorting (popularity vs countdown), prefetching adjacent seasons. Core display engine. |
| **AnimeInfoGrid** | `animev3/AnimeInfoGrid.tsx` | Client | Individual anime card. Shows title, genres, score, studio, cover image, episode countdown timer (1-sec updates), synopsis, external links, add/remove watchlist buttons. Uses SWR cache mutations for optimistic updates. |
| **HeaderProvider** | `animev3/layoutSelector/HeaderProvider.tsx` | Client | React Context provider for season/year selection state. Shared between header selector and page content. |
| **HeaderSelector** | `animev3/layoutSelector/HeaderSelector.tsx` | Client | Dropdown UI for selecting season (Winter/Spring/Summer/Fall) and year. Updates context and triggers navigation. |

### Utility Hooks (`components/animev3/utils/`)

| Hook/Utility | File | Description |
|-------------|------|-------------|
| **useLazyLoad** | `useLazyLoad.tsx` | Intersection Observer hook. Chunks data into groups of 2, triggers callback at 15% visibility threshold. Drives infinite scroll. |
| **usePrefetch** | `usePrefetch.tsx` | Prefetches adjacent season routes (prev/next) to reduce navigation latency. |
| **useInterval** | `useInterval.tsx` | Safe `setInterval` wrapper with cleanup. Used for countdown timers. |
| **getAniListData** | `getAniListData.ts` | AniList GraphQL client. Rate limit monitoring (sleeps 1.5s when < 20 calls remaining). 5000ms request timeout. |
| **fetchWithTimeout** | `fetchWithTimeout.ts` | Wraps `fetch()` with configurable timeout to prevent hanging requests. |
| **timeStampHelpers** | `timeStampHelpers.ts` | Unix timestamp conversion: `unixTimeStampToDate()`, `getInitialTimes()`, `startTimerFromTimeStamp()`, `unixTimeStampToWeekDay()`. |
| **routeChecker** | `routeChecker.ts` | URL validation for season/year route params. |

---

## Watchlist System (`components/mylist/`)

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **PageBase** | `mylist/PageBase.tsx` | Client | Watchlist grid with filtering by status (All, Watching, Completed, Paused, Dropped). Integrates with Zustand store for filter state. SWR for data fetching with 5000ms refresh interval. |
| **HeaderProvider** | `mylist/layout/HeaderProvider.tsx` | Client | Context provider for watchlist header state. |
| **HeaderSelector** | `mylist/layout/HeaderSelector.tsx` | Client | Filter/sort controls for the watchlist view. |

### Watchlist Utilities (`components/mylist/utils/`)

| Utility | File | Description |
|---------|------|-------------|
| **sortUtils** | `sortUtils.ts` | Sorting functions for watchlist entries (by name, score, progress, status). |
| **userListUtils** | `userListUtils.ts` | User list data transformation helpers. |

---

## Authentication (`components/auth/`)

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **SignIn** | `auth/SignIn.tsx` | Client | Sign-in page with OAuth provider buttons (GitHub, Twitter, Google). |

---

## Shared / Common (`components/common/`)

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **NavBar** | `common/NavBar.tsx` | Client | Main navigation bar. Links to Home, Anime Browse, Top Anime, My List. Includes login state. |
| **LogInBox** | `common/LogInBox.tsx` | Client | Auth dropdown. Shows sign-in button or user avatar/menu when authenticated. Integrates with NextAuth session. |
| **HydrationProvider** | `common/HydrationProvider.tsx` | Client | React Context tracking client-side hydration state. Prevents hydration mismatch errors for dynamic content. |
| **AnimeBar** | `common/AnimeBar.tsx` | Client | Season quick-links bar. Provides shortcuts to browse specific seasons. |
| **Card** | `common/Card.tsx` | Client | Card layout primitive. |
| **Grid** | `common/Grid.tsx` | Client | Grid layout primitive. |
| **Button** | `common/Button.tsx` | Client | Button primitive. |

---

## Boundary Components (`app/*/Boundary.tsx`)

| Component | Location | Description |
|-----------|----------|-------------|
| **Anime Boundary** | `app/anime/[...anime]/Boundary.tsx` | Client boundary wrapping animev3 PageBase. Receives server-fetched data as props. |
| **MyList Boundary** | `app/mylist/[...user]/Boundary.tsx` | Client boundary wrapping mylist PageBase. Fetches session, passes to client component. |
| **TopAnime Boundary** | `app/topanime/Boundary.tsx` | Client boundary for top anime display. |
| **User Boundary** | `app/user/[...user]/Boundary.tsx` | Client boundary for user profile with filtering. |

---

## Component Architecture Patterns

1. **Server/Client Boundary Pattern:** Server components (`page.tsx`) fetch data and pass to client boundary components (`Boundary.tsx`) which render interactive UI.
2. **Context Provider Pattern:** `HeaderProvider` components create React Context for shared state within feature domains.
3. **Optimistic Update Pattern:** `AnimeInfoGrid` uses SWR's `mutate()` with `populateCache` for instant UI feedback before API confirmation.
4. **Lazy Load Pattern:** `useLazyLoad` chunks items and uses Intersection Observer to progressively render content.
5. **Deep Clone for Safe Sorting:** `PageBase` deep-clones data before sorting to prevent mutation of cached/original data.

---

## Component Count Summary

| Category | Count |
|----------|-------|
| Feature Components | 8 |
| Shared/Common Components | 7 |
| Boundary Components | 4 |
| Custom Hooks | 3 |
| Utility Modules | 5 |
| **Total** | **27** |
