# CLAUDE.md — kyle-anime (kylevb.com)

An anime **season browser + personal watchlist tracker**. Browse every anime premiering in a season
(live per-episode countdowns, sort by countdown or popularity), search all of AniList, sign in with
Google, add shows to a list, and track status, episode progress, score and dates. Lists are public by
link; only the owner can edit. The landing page (`/`) sells all of it with live data, a no-sign-in
tracker demo and a post-sign-in Quest Log. Production: https://kylevb.com (Vercel).

- **Stack:** Next.js 16.3 App Router (Turbopack) · React 19 · TypeScript · Tailwind 3.4 · NextAuth v4
  (database sessions) · MongoDB native driver 4.x · SWR · react-hot-toast · Vitest
- **Data sources:** [AniList GraphQL](https://graphql.anilist.co): seasons, search, list refresh.
  **Rate limit ≈ 30 req/min** (read `x-ratelimit-remaining`). [Jikan v4](https://api.jikan.moe/v4):
  MyAnimeList "Top Anime" only (~3 req/s, 60/min).
- **Checks:** `npm run check` (typecheck + lint + unit tests). There is no CI build.
- **Design:** every page redesign uses the landing's "Tempest" theme. Load the `tempest-theme`
  skill (`.claude/skills/tempest-theme/SKILL.md`) first; shared pieces live in `components/theme/`.

---

## 1. Commands

```bash
npm ci               # install exactly what package-lock.json pins
npm run dev          # next dev on :3000 (also re-adds the Next.js agent-rules block at the end of this file)
npm run build        # prerenders 28 season pages, /topanime and / by calling AniList/Jikan (needs network)
npm start            # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . (flat config; includes React Compiler rules, see §9)
npm test             # vitest run (unit tests: *.test.ts next to the code)
npm run check        # all three
```

### Environment (`.env.local`, never commit it)

| Var | Needed for | Notes |
|---|---|---|
| `MONGODB_URI` | sessions + lists | Read lazily. Without it pages still build, but auth/list requests fail |
| `NEXTAUTH_SECRET` | next-auth | |
| `NEXTAUTH_URL` | next-auth | Vercel infers it; set `http://localhost:3000` elsewhere |
| `GOOGLE_CLIENT_ID/SECRET` | sign-in | The only provider shown in the UI |
| `GITHUB_ID/SECRET`, `TWITTER_CLIENT_ID/SECRET` | optional | Registered only when both values are set; no UI buttons |
| `GRAPHQL_ANILIST`, `NEXT_PUBLIC_GRAPHQL_ANILIST` | AniList (server / browser) | Fall back to `https://graphql.anilist.co` |
| `JINKANV4_URL`, `NEXT_PUBLIC_JINKANV4_URL` | Jikan (server / browser) | Fall back to `https://api.jikan.moe/v4` |

### Testing signed-in flows without OAuth
Sessions use the NextAuth **database** strategy, so you can fake a login. Point `MONGODB_URI` at a
throwaway DB (e.g. `mongodb-memory-server`). Insert a `users` doc and a
`sessions` doc `{ sessionToken: "t", userId: <user _id>, expires: <future Date> }`, then send the cookie
`next-auth.session-token=t` (http) from curl or Playwright. Never point tests at the real database.

---

## 2. Architecture at a glance

```
 Browser ── HTML/RSC ──►  Next.js 16 (Vercel, Node runtime)
   │                       proxy.ts ............ request-time season redirects (/anime → current season)
   │                       / (landing) ......... ISR 600s ── server/lib/landing ─ ≤ 2 req (1 h data cache) ─► AniList
   │                       /anime/[...anime] ... ISR 300s ── getAniListData ─────────────► AniList
   │                       /topanime ........... ISR 3600s ─ getTopAnimeJinkan ──────────► Jikan
   │                       /search ............. dynamic ─── server/lib/anilist ─────────► AniList
   │                       /user/<id>, /mylist/<id> dynamic ─ server/lib/userList ──┬────► AniList (stale refresh)
   │                       /api/anime-list/* ... route handlers ────────────────────┤
   │                       /api/auth/* ......... NextAuth (MongoDBAdapter) ─────────┴────► MongoDB
   ├─ pages 2+ of a season ───────────────────────────────────────────────────────────────► AniList
   └─ Top Anime "Show more" ───────────────────────────────────────────────────────────────► Jikan
```

**The watchlist is a denormalized snapshot.** Each `users.following[]` entry is a sanitized AniList
media object plus the user's `userData`. Reading a list needs no AniList call. When a list is read and
its snapshot is older than 10 minutes, the server re-fetches airing data for not-yet-finished shows
(§5.5).

**Everything client-supplied is whitelisted and sanitized** (`lib/anime/normalize.ts`, `sanitize.ts`)
before it is stored, and descriptions are sanitized again when rendered.

---

## 3. Route map

| URL | Files | Rendering | Auth | What |
|---|---|---|---|---|
| `/` | `app/(home)/{page,opengraph-image}.tsx`, `components/home/*`, `server/lib/landing.ts`, `lib/landing.ts` | **ISR 600s**, live AniList data | – | Landing (§5.7): hero with a live "Next episodes" card, Magic Sense countdowns, tracker demo, schedule preview, search console, Tempest Archive, FAQ, #quests (sign-up pitch / Quest Log), the "I / am / atomic" post-credits. Session UI is client-only; `?add=<id>&as=<status>` finishes a sign-in intent |
| `/anime`, `/anime/<year>` | `proxy.ts` (fallback: `app/anime/page.tsx`, force-dynamic) | 307 | – | → current season, computed **per request** |
| `/anime/<year>/<season>` | `app/anime/layout.tsx`, `app/anime/[...anime]/{page,Boundary,error,loading}.tsx`, `components/animev3/*` | **ISR 300s**; 28 paths prebuilt (UTC year−5…year+1 × 4) | – | Season grid (§5.1). `proxy.ts` 307s bad/out-of-range slugs and `Fall` → `fall` |
| `/search?q=&page=` | `app/search/*` | dynamic | – | AniList title search, 30/page (§5.4) |
| `/topanime` | `app/topanime/{page,TopAnimeShell,TopAnimeBanner,GlanceStats,CrownConsole,AboutRanking,TopAnimeList,TopAnimeRow,ranking,rankingStore,error}.ts(x)` | **ISR 3600s**; no `loading.tsx` (§9.15) | – | MAL ranking via Jikan: the Octagram (ranks 1–8) + the ranking; "Show more" appends; Back restores loaded pages; "Track" → `/search?q=` |
| `/auth` | `app/auth/page.tsx` | dynamic | – | Account panel, or → `/auth/signin` when signed out |
| `/auth/signin` | `app/auth/signin/page.tsx`, `components/auth/signIn/PageBase.tsx` | static shell | – | Custom NextAuth sign-in page (Google). Honors same-origin `?callbackUrl`, explains `?error=` |
| `/user` | `app/user/page.tsx` | dynamic | – | → `/user/<your id>` or sign-in |
| `/user/<userId>` | `app/user/[...user]/*`, `app/user/_client/*` | dynamic | **public read, owner edits** | **My List**: the full tracker (§5.3) |
| `/mylist` | `app/mylist/page.tsx` | dynamic | – | → `/mylist/<your id>` or sign-in |
| `/mylist/<userId>` | `app/mylist/[...user]/*`, `components/mylist/*` | dynamic | public read | **Airing Schedule**: list shows with an upcoming episode, by weekday (PT) |
| `/api/anime-list` | `app/api/anime-list/route.ts` | – | session | `POST {data: media, status?}` add · `DELETE {data:{id}}` remove |
| `/api/anime-list/ids` | `app/api/anime-list/ids/route.ts` | – | session | `GET` → `{ids}` on the caller's list (401 signed out) |
| `/api/anime-list/<animeId>/user-data` | `app/api/anime-list/[animeId]/user-data/route.ts` | – | session | `PATCH {userData}` → `{message, userData}` (validated, normalized) |
| `/api/anime-list/user/<userId>` | `app/api/anime-list/user/[userParam]/route.ts` | – | public | `GET` → `{list}` (refreshes stale airing data) |
| `/api/auth/*` | `app/api/auth/[...nextauth]/route.ts` | – | – | NextAuth |

`app/robots.ts` keeps crawlers off `/search` (each hit costs an AniList request), list pages, `/api`
and `/auth`.

**List URLs use the owner's Mongo ObjectId.** Old `/<route>/<base64url(email)>` links still work
**only for their signed-in owner**, who is redirected to the id URL. Everyone else gets a 404, so
emails are never exposed or enumerable (`server/lib/userList.ts#resolveListOwner`).

**Nav** (`components/common/NavBar.tsx`, `AnimeBar.tsx`, `NavSearch.tsx`, `LogInBox.tsx`): Home ·
カイル and Seasons (→ `/anime`) · Top Anime · search box (GET `/search`) · Log in **or** avatar menu
{My List, Airing Schedule, Lift Tracker (external), Sign out}.

---

## 4. Feature map

| Feature | User sees | Implementation | Key files |
|---|---|---|---|
| Season browser | Every non-adult TV/movie/OVA/special (not TV_SHORT/ONA) premiering that season | Server fetches page 1 (50) → client reveals 12 at a time (IntersectionObserver sentinel) and fetches pages 2+ from the browser, one request at a time | `components/animev3/PageBase.tsx`, `utils/useLazyLoad.tsx`, `utils/getAniListData.ts` |
| Continuing series | Shows that premiered in an earlier season and are still airing (2-cour, long runners) appear in the season too, with a "Continuing" badge; header toggle (default on) | Page-1 request also returns two carry-over lists; `selectCarryOver()` merges/filters them (§5.1) | `lib/anime/carryOver.ts`, `components/utils/anilist-queries/allCurrAnimeTag.ts`, `PageBase.tsx` |
| Sort | By Countdown (default) / By Popularity | `HeaderContext.sort` (layout-level, survives season nav); countdown uses absolute `airingAt` (`compareByNextAiring`), stable so ties keep popularity order | `layoutSelector/*`, `lib/anime/airing.ts` |
| Season header | "Summer 2026 Anime", months, prev/next, "Current season →" | `useSelectedLayoutSegments()` reads the child route; prev/next are `<Link>`s, hidden outside the valid year window | `layoutSelector/HeaderSelector*.tsx`, `lib/season.ts` |
| Anime card | Title, genres, cover, countdown, score, studio, premiere (PT), source, eps × min, synopsis, links | `AnimeInfoGrid({ info })`, shared by season, search and schedule pages | `components/animev3/AnimeInfoGrid.tsx` |
| Live countdown | "EP13: 1d 7h 14m 52s", "Airing now", or a status ("Finished · 12 eps") | One shared 1 s clock (`useNow`, null during SSR, so no hydration mismatch) | `components/utils/useNow.ts`, `lib/anime/airing.ts` |
| List toggle | "+ Add to list" / "✓ On my list" (hover: "✕ Remove") / "Sign in to track" | `ListToggle` (shared by every card; landing options: add status/label, `block` size, sign-in intent) on `useMyList()`: SWR key `[/api/anime-list/ids, userId]` (a 401 is an error, never an empty list), optimistic with rollback, toasts; `count` = list size incl. in-flight changes, `confirmedCount` = server-confirmed | `components/animev3/ListToggle.tsx`, `components/utils/useMyList.ts` |
| Search | Any anime incl. older seasons, movies, ONAs | Server `searchAnime()`; result links don't prefetch (AniList budget) | `app/search/*`, `server/lib/anilist.ts` |
| My List | Night-sky banner (Skill 02 · Predator): stats (shows, watching, episodes seen, mean score), copy link, the owner's Evolution slime (gulps when a show completes); shelves All/Watching/Plan to Watch/Completed/Paused/Dropped with counts; filters (text, year, season, airing day PT, release status); sort (next episode, title, my score, progress, recently added); the landing tracker demo's card | One client root with local state; owner-only +1 / Edit dialog (status pills, progress, score, start/finish dates, remove); PATCH → server-normalized `userData`; background `router.refresh()` 2 s after edits. No profile photo | `app/user/_client/{MyList,ListCard,EditEntryDialog,listFilters,editForm,api}.ts(x)`, `components/theme/*` |
| Tracker rules | Auto-complete at the last episode, dates auto-filled, score rounded | Enforced on the server | `lib/anime/normalize.ts#normalizeUserData` |
| Airing Schedule | Night-sky banner (Skill 03 · Thought Acceleration) with the hero's Next-episodes card; the landing demo's week panel: tabs All + Mon…Sun (count dots, today ringed), opening on today or the next day with shows; countdown rows with list status/progress (visitors get + Add); share strip (owner); "Not airing right now" | SWR `/mylist/<id>` (fallbackData from SSR, poll 60 s); dropped/completed excluded from the schedule; `renderedAt` from the server picks "today" until `useNow()` hydrates | `components/mylist/{AiringSchedule,NextEpisodes,NotAiringList,schedule}.ts(x)` |
| Air-date freshness | Countdowns roll to the next episode | Server-side refresh of stale snapshots on list read (§5.5) | `server/lib/userList.ts` |
| Top Anime | Night-sky banner (Rankings · The Octagram) with the fetch time, a "top 25 at a glance" (640px+) and #1 with its lead over rank 2 on a magic circle (1024px+); the Octagram (ranks 1–8: gold sigils, crowned #1), then one row design for every rank (rank + score rail, poster, titles, type · eps · year, members, Track); a Great Sage Show-more console; an About panel. Jikan can repeat or skip a rank (it refreshes shows separately; MAL itself has one show per rank), so nothing on the page calls a repeat a tie | Page 1 server-rendered (throws on failure); later pages from the browser one at a time (in-flight guard, dedupe, inline Retry, focus to the first new row, sr status); module snapshot of loaded pages (`rankingStore`); `.js-only` button + `<noscript>` MAL link. Every stat and sentence is computed from loaded items (`ranking.ts`, unit-tested) | `app/topanime/*`, `getTopAnimeJinkan.ts`, `components/theme/{StatGrid,icons}.tsx` |
| Landing | Hero (H1 is the LCP), live "Next episodes" card, 7 live countdown cards with exact season count, sticky CTA, FAQ, post-credits | Static ISR page + client islands; one `LandingProvider` (media by id, `useVisibleAiring`, the intent dialog); original inline-SVG slime mascot (no official art traced) | `app/(home)/page.tsx`, `components/home/*` |
| Landing session slots | "Start my list" (straight to Google, `callbackUrl` `/#quests`) · "Open My List" · "Add my first shows", with same-size skeletons while the session loads | `useLandingSession()` (session + `useMyList().count` + tier); `SessionCta` / `SessionStatusLine` fixed boxes; `<noscript>` sign-in link | `components/home/{useLandingSession,SessionCta,StickyCta}.ts(x)` |
| Tracker demo | "+1" to the finale auto-completes, statuses, score, dates; nothing is saved | Local state that calls the real `normalizeUserData` in handlers | `components/home/TrackerDemo.tsx` |
| Sign-in intent | Signed-out "+ Add to list" / "+ Plan to Watch" opens "Sign in to add {title}"; after Google the show is already on the list | `ListToggle` `onSignedOutAdd` → `LandingProvider` dialog → sessionStorage `kv:add-intent` (15 min) → `/?add=<id>#quests` → `QuestLog`'s `AddIntentHandler` adds once; a bare link only asks | `components/home/{LandingProvider,LandingAddButton,QuestLog}.tsx`, `lib/landing.ts#parseAddIntent` |
| Quest Log | #quests after sign-in: add 3 shows inline, open the Airing Schedule, copy the list link; the slime evolves (Named Slime → Demon Slime at 3 → Demon Lord at 10) | Real list count only; Quest 2/3 flags in localStorage per user, also set by opening your own Airing Schedule and by any list-link copy (`components/theme/ShareLink.tsx`); status messages derived from state | `components/home/{QuestSection,QuestLog,questStore}.ts(x)`, `lib/landing.ts#evolutionTier` |
| Errors | Friendly error/404 pages with retry | `app/error.tsx`, `global-error.tsx`, `not-found.tsx`, per-route `error.tsx` (season, top anime). Retry must refetch the server render: Next 16.3's `retry()`, or `router.refresh()` + `reset()` (`reset()` alone re-shows the error) | |

---

## 5. Data flows

### 5.1 Season page `/anime/2026/fall`
1. `proxy.ts` validates the slug with `seasonRouteRedirect()` (pure, `lib/season.ts`) and 307s if needed.
2. `Boundary.tsx` → `getAniListData({page:1, withCarryOver: true})`. It returns
   `{ok, media, hasNextPage, carryOver}` and never throws. The same single request also asks for
   TV series that started before the season (`seasonStartMs`, app convention) and either ended
   after it began (`ended`) or are still RELEASING (`airing`). AniList's `endDate_greater` skips
   null end dates, hence two lists. `lib/anime/carryOver.ts#selectCarryOver` dedupes them, drops
   the season's own shows (page 1, or anything AniList files under that season), and sorts by
   popularity.
   For a season that **hasn't started**, `airsDuring()` keeps only shows expected to air in it:
   - A show whose next episode comes after the whole season (a break) is dropped.
   - An unknown episode count means "long runner" only past episode 26, or after 6+ months on
     air. Otherwise one 13-episode cour is assumed and the last episode estimated.
   - The `airing` list is fetched oldest first (`$airingSort`), so its 50-item cap drops the
     newest premieres, which are the least likely to continue.
   The end-date bound is the day after the season start, because AniList dates are Japanese and
   a first-day finale is usually the previous evening in UTC. If the combined request fails,
   `getAniListData` retries once without the carry-over lists (never after a 429). Known limit:
   for a past season, a long runner that was on a break then but is airing today still counts.
   On `ok:false`, Boundary **throws**, so ISR keeps serving the last good page and a first-ever
   failure shows `error.tsx`. A successful empty result (e.g. a far-future season) renders the
   "No anime listed yet" state.
3. `PageBase` (client) keeps one `media` array (deduped by id, popularity order) plus a
   `{nextPage, hasNextPage}` cursor. The visible list is derived with `useMemo` from `media` and the
   sort mode. The first 12 cards are in the SSR HTML.
   In countdown mode, pages 2–6 load right after hydration, not on scroll. Cards already on
   screen are **pinned**, and later pages are sorted in behind them, so the server-rendered top
   12 never reshuffle. Changing the sort re-sorts everything.
   Continuing series merge into both sorts ("By Popularity" uses AniList's `popularity` count).
   They are deduped against later season pages and hidden by the `showContinuing` toggle in
   `HeaderContext`, which also re-sorts.
   Countdown order counts only episodes airing **within the browsed season**, ties broken by
   popularity, so past and upcoming seasons don't open with today's long runners. In popularity
   mode, carry-overs less popular than every loaded season show wait until the season's later
   pages load.
4. Pages 2+ are fetched in the browser. Refs guard against double fetches; a failure shows an inline
   Retry, and the season is never silently truncated.
   **Stale ISR pages.** ISR serves the first visit after a quiet spell the last render, while Next
   rebuilds it in the background. `getAniListData` stamps `fetchedAt`, and Boundary passes it on.
   If the page's data is over 10 minutes old (`components/animev3/utils/seasonFreshness.ts`),
   `PageBase` re-fetches page 1 + continuing series from the browser right after load: one AniList
   request, queued before the eager page loads, with no season-only fallback (a failed refresh
   keeps the page as is; `carryOverIncluded` says whether continuing series were fetched).
   - **Merging.** Page 1 is replaced outright if no later page has loaded (the usual case).
     Otherwise `mergeFresh` replaces shows by id. Every browser-fetched page also updates shows
     already in the list.
   - **Ordering.** The list re-sorts unless `window.scrollY` shows the reader has scrolled; then
     the revealed cards stay pinned. (Revealed count is no signal: wide screens reveal 24 cards on
     load.)
   - **Remembering.** The refreshed data is kept per season for the browser session
     (`rememberRefresh`), so back/forward, which replays the original payload, doesn't refresh
     again.
   The season header also switches from the layout's render time to the real clock after
   hydration (`useNow() ?? renderedAt`), so a stale page doesn't mislabel the current season.
5. AniList throttling in `getAniListData`: a per-process queue serializes requests. It pauses 2 s
   when `x-ratelimit-remaining` < 10, retries a 429 once after `min(Retry-After, 5 s)`, and times out
   the body read. The build prerenders on 1 CPU (`next.config.js`) with `staticGenerationRetryCount: 2`.

### 5.2 Adding a show (any card)
`useMyList().add(media)` → the id goes into a module-level **pending overlay**, shown on every card at
once → `POST /api/anime-list` → `normalizeMedia()` whitelists and sanitizes the payload → atomic
`updateOne({_id, "following.id": {$ne: id}, "following.1999": {$exists: false}}, {$push: …})` →
`"Successfully Added to List"`, `"Already In List"`, or 409 "list is full" at 2,000 shows. On success
the id is committed to SWR `/api/anime-list/ids` with a synchronous functional `mutate`, and open
Airing Schedules (`scheduleSwrKey`) revalidate. The overlay is cleared either way, so a failure rolls
back. SWR's own async optimistic mutate isn't used: it drops overlapping mutations.
Remove uses `$pull`. On cards, removal takes two taps ("Tap again to remove"), because it deletes
progress, score and dates. Clients branch on the exact message strings; keep them stable.

### 5.3 My List `/user/<id>`
`layout.tsx` → `requireListOwner()` (`server/lib/listRoute.ts`: redirect/404 happen **before
streaming**, so they get real status codes) → `page.tsx` (same cached lookup) → `loadListEntries()` →
`toMyListEntry` (slim payload) → `<MyList isOwner>`. Edits PATCH
`/api/anime-list/<id>/user-data` and apply the **response's** `userData`. `+1` is optimistic and
serialized per show; failures roll back with a toast. For the owner, `MyList` re-reads
`GET /api/anime-list/user/<id>` once on mount. Back/forward replays the router cache's original
payload, and without the re-read a later `+1` would write stale values back. Local edits since mount
win. Visitors see the owner's **first name only** and no photo; page titles and link previews always
use the first name (`publicOwnerName`).

### 5.4 Search `/search?q=frieren&page=2`
`searchParams.ts` normalizes `q` (trimmed, ≤ 100 code points) and `page` (1–50) →
`searchAnime()` (throws `AniListError`) → caught → inline error with "Try again". Results use the
shared card.

### 5.5 Server-side air-date refresh (`server/lib/userList.ts#refreshEntriesIfStale`)
On every list read (both list pages and `GET /api/anime-list/user/<id>`):
1. **Filter.** Only entries whose status isn't `FINISHED`/`CANCELLED` are candidates: airing shows
   first, at most 150 per refresh. Skip if `listRefreshedAt` is < 10 minutes old.
2. **Claim.** A conditional `updateOne` on `listRefreshedAt` acts as a lock, so one request per user
   does the work.
3. **Fetch and write.** `fetchMediaByIds` pulls 50 ids per AniList request. **Each batch** is written
   as it arrives (`bulkWrite` with positional `$set` of the snapshot fields only), so a later failure
   keeps earlier progress. **`userData` is never touched.**
4. **Budget.** The refresh gets 4 s inside the render. If it's slower, it finishes via `after()` so
   the next view is fresh.
5. **Failure** (e.g. 429). The lock is shortened so it retries in about 1 minute. The page always
   renders the stored data; AniList problems never fail a list page.

### 5.6 Auth
`/auth/signin` → `signIn("google", {callbackUrl})` → NextAuth + `MongoDBAdapter` → `users`,
`accounts`, `sessions` docs (**database** strategy, cookie `next-auth.session-token`, or
`__Secure-…` on https). `callbacks.session` sets `session.objectId = user.id`. **Every write is scoped by
it and list URLs use it.** Switching to JWT sessions breaks both. `authOptions.adapter` is a getter
that rebuilds the adapter after a failed Mongo connection (`server/auth/index.ts`).

### 5.7 Landing `/` (`server/lib/landing.ts#loadLandingData`, ISR 600 s)
1. **Season.** `landingSeason()` (`lib/season.ts`): the current UTC season, or the next one when it
   starts within 14 days (**preview**: labels say "Preview Fall 2026" and link the explicit season
   path, since `/anime` still resolves to the current season).
2. **Season request** (1 AniList request, 2 after a 429 retry): exactly `/anime`'s page 1
   (`getAniListData`, carry-over on, no fallback, 6 s), default fetch cache, so the route stays ISR.
   `pickAiringCandidates()` keeps up to 12 shows whose next episode airs within
   [now − 30 min, now + 7 days] (16 in preview): the 30 most popular, soonest first.
3. **Extras request** (0 on a data-cache hit, else 1; skipped when step 2 spent 2): the Tensura
   franchise + banners, the Rimuru character and the season's id pages for an exact show count
   (`landingExtrasQuery`), with `cache: "force-cache"`, `next.revalidate` 3600, tag
   `landing-extras`, through `enqueueAniListRequest`. `parseLandingExtras()` validates each part on
   its own; images only from `https://s4.anilist.co/`. **Never use `pageInfo.total`** (AniList
   reports 5000).
4. **Failures.** Season request down on a production server → `loadLandingData` **throws**, so ISR
   keeps the last good page and retries on the next request (like the season pages). During
   `next build` (`NEXT_PHASE`) and `next dev` it renders fallbacks instead: `season: null`, no
   countdowns, fallback panels. Extras down (any phase) → `TEMPEST_FALLBACK` (static, "Find it"
   search links instead of adds) and a "50+" count. Either way, at most 2 AniList requests per
   regeneration.
5. **Client.** Only `{generatedAt, season, mediaById (≤ 21 full snapshots, so adds store complete
   data), continuingIds}` reach `LandingProvider`. Islands pick rows with `useVisibleAiring()`
   (server time until hydrated, then a 30 s clock; aired rows are backfilled in place). The landing
   never calls `/api/anime-list/user/<id>` (it can trigger AniList refreshes); personalization is
   only the `/api/anime-list/ids` count and membership that `useMyList` already loads.

---

## 6. Data model (MongoDB, one database)

`users`, created by the NextAuth adapter and extended by the app:
```ts
{ _id: ObjectId, name, email, image, emailVerified,   // adapter-owned; never render email
  following: ListEntry[],                              // app-owned watchlist, embedded, no _id per entry
  listRefreshedAt?: number }                           // epoch ms of the last AniList refresh (lock)

ListEntry = AnimeMedia & { userData: UserAnimeData }  // lib/anime/types.ts
AnimeMedia  // mirrors components/utils/anilist-queries/mediaFields.ts (the GraphQL fragment IS the schema)
{ id /* AniList id — the key everywhere */, idMal, title{romaji,english,native}, description /* sanitized HTML */,
  coverImage{extraLarge,large,medium,color} /* AniList CDN only */, season, seasonYear, format, status,
  episodes, duration, source, genres[], averageScore, popularity, studios{nodes[{name}]}, startDate{year,month,day},
  externalLinks[{id,url,site}] /* http(s) only */,
  upcomingEpisode /* alias of nextAiringEpisode */, upComingAirDate{episode[{airingAt,timeUntilAiring,episode}]},
  firstEpisode{episode[{airingAt,episode}]} }
UserAnimeData
{ listType: "watching"|"planning"|"completed"|"paused"|"dropped", episodeProgressNumber: number,
  startDate: ms|null, finishDate: ms|null,   // calendar days: UTC midnight of the date (auto-filled = today in PT)
  score: 0–10 (one decimal)|null }
// Rules (normalizeUserData): progress clamps to a known episode count; reaching the last episode
// auto-completes watching/planning shows, unless the user just changed status (rewatch);
// completing fills progress; start/finish dates auto-fill once.
```
`accounts`, `sessions` and `verification_tokens` belong to NextAuth. There are no custom indexes
(lookups are by `_id`). Reads go through `normalizeEntry()`, which fills defaults for legacy entries,
drops duplicates, re-sanitizes, and bounds dates.

**Adding a field from AniList** takes four edits:
1. `mediaFields.ts` (the GraphQL fragment)
2. `AnimeMedia` in `lib/anime/types.ts`
3. `normalizeMedia()` in `lib/anime/normalize.ts`
4. `MEDIA_SNAPSHOT_FIELDS`, or the refresh won't update the field

---

## 7. State & caching

| Layer | Where | Notes |
|---|---|---|
| ISR | season pages 300 s, `/topanime` 3600 s, `/` 600 s | Season/Top Anime: upstream failure **throws** → last good page kept. `/` throws only for the season request (the build renders fallbacks) |
| Next data cache | `landing-extras` (Tensura, Rimuru, season id pages), 3600 s | `revalidateTag("landing-extras", "max")` refreshes it (Next 16 requires the profile argument); only 200s are cached |
| Proxy | `proxy.ts` | Season redirects at request time (never in `next.config.js` `redirects()`, which are build-time) |
| SWR | `[/api/anime-list/ids, userId]` (list membership, all cards; per user so an account switch in another tab never shows the old ids) · `/mylist/<id>` (Airing Schedule, poll 60 s) | No root `SWRConfig` |
| React context | `HeaderContext` (season sort mode), under `app/anime/layout.tsx` | |
| Local state | My List (`MyList.tsx`), Top Anime list, season `PageBase` | |
| Module memory | `app/topanime/rankingStore.ts` | Top Anime's loaded pages for the tab, keyed by page 1's ids; restored on the next client visit (Back from Track) |
| Shared clock | `useNow()` | `useSyncExternalStore`; one interval for the page |
| Mongo | `listRefreshedAt` | Refresh lock/throttle |
| sessionStorage | `kv:add-intent` | Landing sign-in intent `{id, status?, at, media}`; auto-add only within 15 min, consumed once |
| localStorage | `kv:quests:<userId>` (Quest 2/3 flags), `kv:live-timers` (pause live timers) | Per device; read via `useSyncExternalStore`, every access in try/catch |

---

## 8. Directory map

```
proxy.ts                    request-time /anime season redirects
lib/                        pure, shared by server + client (unit-tested)
  season.ts                   season math: current season, valid years, route validation, shiftSeason, landingSeason
  landing.ts                  landing constants/types + pure helpers (airing candidates, extras parsing, Tempest,
                              tiers, schedule grouping, add-intent parse/serialize)
  routes.ts                   myListPath, airingSchedulePath, searchPath, signInPath
  anime/types.ts              AnimeMedia, ListEntry, UserAnimeData, LIST_STATUSES(+labels), displayTitle
  anime/normalize.ts          normalizeMedia/Entry/UserData — whitelist, coercion, tracker rules
  anime/sanitize.ts           sanitizeDescription (allow-list <br><i><b><em><strong>, balanced), descriptionToText
  anime/airing.ts             nextAiring, countdown formatting, premiereLabel, airingWeekday (PT), compareByNextAiring
  anime/statusBadge.ts        STATUS_BADGE_CLASS (list-status badge colors)
server/                     server-only
  auth/index.ts               authOptions (Google + optional GitHub/Twitter, lazy MongoDBAdapter, session.objectId)
  lib/mongodb.ts              the only MongoClient (cached on globalThis, retries, failed connects not cached)
  lib/anilist.ts              anilistQuery (throws AniListError, 429 retry), fetchMediaByIds, searchAnime
  lib/userList.ts             resolveListOwner, readEntries, loadListEntries, refreshEntriesIfStale, getListIds
  lib/listRoute.ts            lookupListOwner (React cache) + requireListOwner (layout guard)
  lib/landing.ts              loadLandingData (≤ 2 AniList requests; throws only at runtime when the season fails), fetchLandingExtras
app/
  layout.tsx, providers.tsx   metadata/footer; SessionProvider > {children, Toaster (themed), Analytics}
  error.tsx, global-error.tsx, not-found.tsx
  (home)/  anime/  search/  topanime/  auth/  user/  mylist/   see §3
  api/anime-list/             route handlers (see §3)
components/
  animev3/                    season browser: PageBase, AnimeInfoGrid (shared card), AnimeInfoSkeleton,
                              layoutSelector/ (header + sort context), utils/ (getAniListData, useLazyLoad, jinkanData/)
  mylist/                     Airing Schedule UI (week panel, NextEpisodes card) + schedule.ts (grouping)
  common/                     NavBar, AnimeBar (nav links), NavSearch, LogInBox (account menu), Grid
  animev3/ListToggle.tsx      the shared add/remove toggle (every card)
  theme/                      the Tempest design kit for every page (guide: .claude/skills/tempest-theme):
    tokens.ts                   class tokens (focus rings, containers, type, panels, cards, buttons, fields, shelves)
    PageBanner                  night-sky app-page header (eyebrow, SageLine, h1, actions, aside; asideClassName)
    StatGrid, icons             the stat dl (My List, Top Anime); TrophyIcon, CrownIcon, StarIcon
    EvolutionCard, SagePanel    the evolving slime card; themed empty/error states
    ShareLink, LiveTimersToggle share strip + useCopyListLink; the timers pause button
  home/                       the landing (§5.7):
    LandingProvider             media by id, useLanding, useVisibleAiring, the sign-in intent <dialog>
    useLandingSession           loading | signedOut | signedIn {userId, firstName, count, tier}
    SessionCta, StickyCta       primary CTA slot + status line (fixed boxes), sticky bar / pill
    LandingAddButton            ListToggle + intent dialog + list_add analytics
    QuestSection, QuestLog      #quests: sign-up pitch or Quest Log + AddIntentHandler; questStore (flags)
    Hero, HeroSlime, HeroNextUp, NightSky, AiringNext, AiringGrid, CountdownText, TrackerDemo,
    ScheduleDemo, SageSearch, TempestArchive, TempestShelf, Faq, PostCredits, Reveal
                                the chapters; Slime + slimeArt (original mascot SVG), SageLine (《Notice》 lines)
    analytics.ts                typed Vercel Analytics events (trackLanding, trackOnce)
  auth/                       sign-in page, SignOutButton, GoogleIcon
  utils/                      anilist-queries/ (mediaFields fragment + queries, landingExtrasQuery), fetchWithTimeout,
                              useMyList, useNow
styles/globals.css          Tailwind layers, scrollbar, sprite icons (.mal .anilist .crunchyroll .star)
@types/                     Session.objectId, global _mongoClientPromise
.github/workflows/          cron.yaml (curl /anime every 5 min), health-check.yml. GitHub auto-disabled both (re-enable in the Actions tab)
```

---

## 9. Conventions & gotchas

1. **Season math lives only in `lib/season.ts`** (UTC; winter = Jan–Mar … fall = Oct–Dec). Don't
   compute "current season" during render in static pages, because it gets baked into the HTML. Link
   to `/anime` instead; `proxy.ts` resolves it per request.
2. **Time display is fixed to America/Los_Angeles** (`lib/anime/airing.ts`) so server and client
   render identical text. Anything that depends on "now" must use `useNow()`, which is `null` until
   hydrated.
3. **Never** `dangerouslySetInnerHTML` an anime description without `sanitizeDescription()`. Stored
   legacy data may be hostile, and AniList itself sometimes leaves tags unclosed.
4. **Entries are keyed by AniList `id`.** Jikan (`/topanime`) only has MAL ids, so never send those
   to `/api/anime-list`. Use the "Track" → search flow instead.
5. **The AniList budget is shared** (~30/min per server IP). Don't prefetch links to search results.
   Avoid new server-side AniList calls on hot paths, and keep `getAniListData`'s queue.
6. **Redirects/404s must happen before streaming.** A `redirect()`/`notFound()` under a `loading.tsx`
   boundary is sent as a 200 with a client-side redirect. Use `proxy.ts` or a layout (see
   `server/lib/listRoute.ts`).
7. **ESLint includes the React Compiler rules as errors**: no synchronous `setState` in effects, no
   `Date.now()`/`Math.random()` during render, no reading `ref.current` during render, no mutating
   props or state. Derive state or use event handlers / `useSyncExternalStore`.
8. `server/**` and `mongodb` must never be imported from client components.
9. `following` entries must stay plain JSON (no Dates/ObjectIds). Server components pass them straight
   to client components.
10. `useSearchParams()` needs a `<Suspense>` boundary, or it de-opts static pages to client rendering
    (see `app/auth/signin/page.tsx`).
11. `next dev` appends the Next.js agent-rules block below and sets `tsconfig` `moduleResolution:
    "bundler"`. Both are expected; commit them.
12. Route handlers need the Node runtime (the MongoDB driver). Don't add `runtime = "edge"`.
13. `body` is `grid-rows-[auto_1fr_auto]` (nav / page / footer). Extra in-flow children at the root
    shift the rows. Its single column is `auto`, so a fixed-width child wider than the phone widens
    the whole page; the landing's `main` has `min-w-0` and its sections `[contain:inline-size]`.
    List layouts also need `min-w-0` through their grids/flex containers; schedule cards stay in one
    column below 768px. Keep status/day scrolling inside its own row and metadata columns shrinkable.
14. **Never use `server/lib/anilist.ts#anilistQuery` on static or ISR pages.** Its `cache: "no-store"`
    makes the route dynamic, and every view would call AniList. Use `getAniListData` (default fetch
    cache) or a `force-cache` fetch through `enqueueAniListRequest`, as `server/lib/landing.ts` does.
15. **The landing is static: nothing on the server may know the visitor.** No `cookies()`,
    `headers()`, `searchParams` or `getServerSession` in `app/(home)`; session UI goes through
    `useLandingSession()` and renders a same-size placeholder while it loads. Don't add a
    `loading.tsx` to `app/(home)`: the page is async, so the static HTML would ship the fallback and
    hide the whole landing in a `<div hidden>` until JavaScript swaps it in (no-JS visitors and the
    H1's LCP both suffer). `/topanime` is the same (static ISR, async page): no `loading.tsx` there
    either.
16. Tailwind scans `app/`, `components/` and `lib/` (`tailwind.config.js` `content`). Class maps
    shared from elsewhere (e.g. `lib/anime/statusBadge.ts`) are silently dropped from the CSS unless
    their folder is listed there.
17. **Motion intentionally ignores the OS reduced-motion preference** (landing and every
    Tempest-themed page). Use ordinary animation/transition utilities, not `motion-safe:` or
    `motion-reduce:`. Keep offscreen pausing and the explicit "Pause live timers" control.
18. **Redesigns use the Tempest theme** (`tempest-theme` skill). Landing demos must match the
    real pages they advertise: `TrackerDemo` ↔ My List's card, `ScheduleDemo` ↔ the Airing
    Schedule's week panel, `HeroNextUp` ↔ `NextEpisodes`, and SageSearch's Top Anime doorway ↔
    `/topanime`'s banner sub (the same promise: highest-ranked shows, each with a Track
    shortcut). Change both sides together. In-page jump links use next/link or a button, never a
    plain `<a href="#…">`: a native fragment entry has no router state, so a later Back changes the
    URL but not the page.

---

## 10. Known limitations / next steps

- Lists are public to anyone with the link; there's no private-list setting.
- Landing: a build while AniList is down ships a fallback `/` (no countdowns) until the first
  successful regeneration (≤ 10 min after traffic). The Tensura data (`TEMPEST_IDS`, short labels, `TEMPEST_FALLBACK`) is static and
  needs a code change for new franchise entries.
- A stale ISR season page is corrected in the browser about a second after load (§5.1). Visitors
  without JavaScript still get the cached copy until Next's background rebuild lands.
- `SessionProvider` has no server session, so the nav avatar and card toggles show a loading pill
  for a moment on full page loads.
- `+1` sends `current + 1`. A stale tab could still overwrite a newer value; an atomic increment
  endpoint would fix it.
- No per-user rate limiting on the write APIs. Lists are capped at 2,000 shows.
- GitHub auto-disabled the cache-warm and health-check crons; re-enable them or use Vercel Cron and
  an uptime monitor.
- `next build` fails if AniList or Jikan stays down past the prerender retries. This is deliberate:
  pages throw rather than cache an empty page. Redeploy once the API is back.
- Season pages' `app/anime/[...anime]/loading.tsx` ships its skeleton plus the real grid in a
  `<div hidden>` in the ISR HTML (the §9.15 problem); `/topanime` dropped its `loading.tsx` for this.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
