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
| `/anime/<year>/<season>` | `app/anime/layout.tsx` (`<main>` + `HeaderProvider` only), `app/anime/[...anime]/{page,Boundary,error}.tsx`, `components/animev3/{PageBase,season/*}`, `components/theme/{AnimeInfoCard,AnimeInfoCardSkeleton,cardLayout,AnimeCard,AnimeDetailsDialog}.ts(x)` | **ISR 300s**; 28 paths prebuilt (UTC year−5…year+1 × 4); no `loading.tsx` (§9.15) | – | Season browser (§5.1). `proxy.ts` 307s bad/out-of-range slugs and `Fall` → `fall` |
| `/search?q=&page=` | `app/search/*` (`SearchResults.tsx`: the season page's card (`CARD_LAYOUT`) + details sheet) | dynamic | – | AniList title search, 30/page (§5.4) |
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
| Season browser | Night-sky banner (Skill 01 · Magic Sense) with a phase-aware Great Sage line, the months, Previous/Next season tiles (+ "Current season" off-season) and, from 1024px for current/upcoming seasons, the Next-episodes card; a controls panel; "Fall 2026 shows 72 · 21 continuing" (`50+` until every page loads); a 1–3 column grid (classic card; 2–5 for the poster) of every non-adult TV/movie/OVA/special/music entry (not TV_SHORT/ONA); a Great Sage divider + **Re-sort** when shows below the pinned cards air sooner; an inline load error with Retry; the landing's dashed end card ("All 72 Fall 2026 shows sensed, excluding ONAs, TV shorts and adult titles.", data time, next season, back to the top) | Server fetches page 1 (50) → client reveals 12 at a time (IntersectionObserver sentinel) and fetches pages 2–6 from the browser right after hydration, one request at a time. All copy in `lib/anime/seasonCopy.ts`, ordering/pinning in `lib/anime/seasonOrder.ts` (both unit-tested) | `components/animev3/PageBase.tsx`, `components/animev3/season/*`, `utils/useLazyLoad.tsx`, `utils/getAniListData.ts` |
| Continuing series | Shows that premiered in an earlier season and are still airing (2-cour, long runners) appear in the season too, with a "Continuing" badge; a "✓ Continuing series 21" toggle (default on; `21+` when a carry-over list hit AniList's 50-item cap); a season with only continuing series says so ("No new Fall 2026 shows here yet…"), or offers "Show continuing series" when they're hidden; "Continuing series didn't load from AniList." when the page-1 request fell back without them | Page-1 request also returns two carry-over lists; `selectCarryOver()` merges/filters them (§5.1); `carryOverIncluded` / `carryOverCapped` from `getAniListData` | `lib/anime/carryOver.ts`, `components/utils/anilist-queries/allCurrAnimeTag.ts`, `PageBase.tsx`, `season/SeasonEmpty.tsx` |
| Sort | "Sort by Countdown (default) / Popularity" chips, and a line saying what the order means for this season (past seasons: "Summer 2026 has ended, so countdown order matches popularity.") | `HeaderContext.sort` (layout-level, survives season nav); countdown uses absolute `airingAt` within the season (`countdownComparator`), stable so ties keep popularity order | `layoutSelector/HeaderProvider.tsx`, `season/SeasonControls.tsx`, `lib/anime/seasonOrder.ts` |
| Season banner | "Fall 2026 Anime", the Great Sage line (current: the landing's "Magic Sense active. Incoming episodes detected."; upcoming: "Winter 2027 starts January 1. …"; past: "…has ended. Magic Sense is reading the archive."), months, the lineup's scope (640px+), season tiles, Next-episodes card | Rendered by `PageBase` (the layout has no data). A per-minute clock leaf (`useSeasonPhase`: the data's fetch time until it runs). Tiles prefetch on intent only (hover/focus/touch) and show a `useLinkStatus` spinner while pending; keyboard focus follows to the same tile on the new page (`season/seasonFocus.ts`). Tiles outside the valid year window are omitted | `season/{SeasonBanner,SeasonHeader,SeasonNav,useSeasonPhase,seasonFocus}.ts(x)`, `components/theme/LinkPendingGlyph.tsx`, `lib/season.ts` |
| Anime card + details sheet | **Classic layout** (the owner's original organization, default): a gel card warmed by the cover's color; the title (sage, 2 lines) over genre chips; the cover with the Magic Sense HUD across its top ("PREMIERE / 1h 28m 56s": violet for a premiere, amber in the last hour, emerald + a card rim while airing, or the release status "FINISHED / 28 eps"), a Continuing / Premiere badge, a "★ 8.2 · TV" pill and a slime perched on shows on your list (it gulps when you add one); beside it a Great Sage readout (Studio, Premiere date/time PT, Source, Episodes "12 × 24 min" / "25 min each", a numbering note when AniList numbers past the count) and the synopsis well (scrolls with a swipe on touch, on hover with a mouse); a footer with the pill add button and the MAL / AniList / Crunchyroll glyphs. Tapping the card (anywhere but the footer and the synopsis) opens a 《Analyze》 sheet (bottom sheet on phones): premiere, format, episodes, length, source, studios, score, genres, sanitized synopsis, the add button, links. Unknown fields are left off the card; the sheet says "TBA" (unaired) or "Not listed on AniList". **Poster layout** (`AnimeCard`, Oct 2026 redesign): cover with a countdown chip, title, "★ 7.6 · TV · Studio", genres, add button | One constant picks the layout for the season page, `/search` and the landing's Magic Sense: `ANIME_CARD_LAYOUT` in `components/theme/cardLayout.ts` (`CARD_LAYOUT` = card, skeleton, add control, grid, cover sizes, skeleton fill, end-card span, landing grid). Cards are memo'd; the page injects its add control as a module-level `Action`; one `useAnimeDetails()` sheet per page (a native modal `<dialog>` outside the grid, with its own sr-only status). The classic card's CSS half is the "Classic anime card" section of `styles/globals.css` (gel surface, HUD tones, well, perch, `site-glyphs.webp` masks); its class strings live in `tokens.ts`. The Quest Log always uses the compact poster. My List, the Airing Schedule and Top Anime have their own cards and rows | `components/theme/{AnimeInfoCard,AnimeInfoCardSkeleton,cardLayout,AnimeCard,AnimeCardSkeleton,AnimeDetailsDialog}.ts(x)`, `lib/anime/cardLabels.ts` |
| Live countdown | "EP 13 · 1d 7h 14m 52s", "Airing now", or a status ("Finished · 12 eps") | `CountdownText` on one shared 1 s clock (`useNow`, null during SSR, so no hydration mismatch); "Pause live timers" in the controls | `components/home/CountdownText.tsx`, `components/utils/useNow.ts`, `lib/anime/airing.ts` |
| List toggle | "+ Add to list" / "✓ On my list" (hover: "✕ Remove") / "Sign in to track" | `ListToggle` (shared by every card: `ListToggleFillAction` is the classic card's `fill` pill, `ListToggleAction` the poster's full-width `block`, both 44px on phones; in-list buttons carry `data-in-list`, and `data-just-added` for 0.9 s after your own add (the classic card's perched slime); landing options: add status/label, sign-in intent; `onResult` reports each add/remove to the details sheet) on `useMyList()`: SWR key `[/api/anime-list/ids, userId]` (a 401 is an error, never an empty list), optimistic with rollback, toasts; `count` = list size incl. in-flight changes, `confirmedCount` = server-confirmed | `components/animev3/ListToggle.tsx`, `components/utils/useMyList.ts` |
| Search | Any anime incl. older seasons, movies, ONAs, as the season page's cards and sheet (the page itself isn't redesigned yet: Skill 04 · Great Sage) | Server `searchAnime()` → client `SearchResults`; result links don't prefetch (AniList budget) | `app/search/*`, `server/lib/anilist.ts` |
| My List | Night-sky banner (Skill 02 · Predator): "N still airing, M with new episodes", stats (shows, watching, episodes seen with "≈ N days of runtime" from 640px, mean score), copy link, the owner's Evolution slime (gulps when a show completes); shelves All/Watching/Plan to Watch/Completed/Paused/Dropped with counts (one scrolling row on phones); search + "Sort & filter" (phones) / sort + filters (text, year, season, airing day PT, release status); sort (next episode, new episodes, title, my score, progress, recently added); the landing tracker demo's card with an "N new" chip (aired, not logged; Watching/Paused); a Great Sage console toast for every +1 and save | One client root with local state; the view lives in the URL (`?shelf=&sort=&q=&year=&season=&day=&release=`, read with `useSearchParams`, written with `replaceState`); owner-only +1 / Edit dialog (status pills, progress, score, start/finish dates, remove; sticky Cancel/Save); PATCH → server-normalized `userData`; tracker lines from `lib/anime/trackerConsole.ts` (toast visual only, spoken through one sr-only status); background `router.refresh()` 2 s after edits. No profile photo | `app/user/_client/{MyList,ListCard,EditEntryDialog,listFilters,editForm,api}.ts(x)`, `components/theme/*` |
| Tracker rules | +1 on Plan to Watch/Paused moves the show to Watching; auto-complete at the last episode; dates auto-filled; score rounded | Enforced on the server | `lib/anime/normalize.ts#normalizeUserData` |
| Airing Schedule | Night-sky banner (Skill 03 · Thought Acceleration) with the hero's Next-episodes card; the landing demo's week panel: tabs All + Mon…Sun (count dots, today ringed), opening on today or the next day with shows ("The whole week" on the Next-episodes card opens All); countdown rows with list status/progress and the "N new" chip (visitors see whose, and get + Add); a day-aware Great Sage line ("Now airing…", "Today: 2 episodes left, the next at 7:30 AM PT."); share strip and "Not airing right now" in a side column for the owner, below the panel for visitors | SWR `/mylist/<id>` (fallbackData from SSR, poll 60 s); dropped/completed excluded from the schedule; `renderedAt` from the server picks "today" and the banner line until the per-minute clock (`useMinuteNow`) hydrates; the selected tab lives in `?day=` | `components/mylist/{AiringSchedule,NextEpisodes,NotAiringList,schedule}.ts(x)` |
| Air-date freshness | Countdowns roll to the next episode | Server-side refresh of stale snapshots on list read (§5.5) | `server/lib/userList.ts` |
| Top Anime | Night-sky banner (Rankings · The Octagram) with the fetch time, a "top 25 at a glance" (640px+) and #1 with its lead over rank 2 on a magic circle (1024px+); the Octagram (ranks 1–8: gold sigils, crowned #1), then one row design for every rank (rank + score rail, poster, titles, type · eps · year, members, Track); a Great Sage Show-more console; an About panel. Jikan can repeat or skip a rank (it refreshes shows separately; MAL itself has one show per rank), so nothing on the page calls a repeat a tie | Page 1 server-rendered (throws on failure); later pages from the browser one at a time (in-flight guard, dedupe, inline Retry, focus to the first new row, sr status); module snapshot of loaded pages (`rankingStore`); `.js-only` button + `<noscript>` MAL link. Every stat and sentence is computed from loaded items (`ranking.ts`, unit-tested) | `app/topanime/*`, `getTopAnimeJinkan.ts`, `components/theme/{StatGrid,icons}.tsx` |
| Landing | Hero (H1 is the LCP), live "Next episodes" card, 5 live countdown cards (the season page's card via `CARD_LAYOUT`, opening the same details sheet; 7 in the poster layout) with exact season count, sticky CTA, FAQ, post-credits | Static ISR page + client islands; one `LandingProvider` (media by id, `useVisibleAiring`, the intent dialog); original inline-SVG slime mascot (no official art traced) | `app/(home)/page.tsx`, `components/home/*` |
| Landing session slots | "Start my list" (straight to Google, `callbackUrl` `/#quests`) · "Open My List" · "Add my first shows", with same-size skeletons while the session loads | `useLandingSession()` (session + `useMyList().count` + tier); `SessionCta` / `SessionStatusLine` fixed boxes; `<noscript>` sign-in link | `components/home/{useLandingSession,SessionCta,StickyCta}.ts(x)` |
| Tracker demo | "+1" to the finale auto-completes, statuses, score, dates; nothing is saved | Local state that calls the real `normalizeUserData` in handlers; its console lines come from `lib/anime/trackerConsole.ts` (shared with My List); the "N new" chip and countdown line use the real show's schedule | `components/home/TrackerDemo.tsx` |
| Sign-in intent | Signed-out "+ Add to list" / "+ Plan to Watch" opens "Sign in to add {title}"; after Google the show is already on the list | `ListToggle` `onSignedOutAdd` → `LandingProvider` dialog → sessionStorage `kv:add-intent` (15 min) → `/?add=<id>#quests` → `QuestLog`'s `AddIntentHandler` adds once; a bare link only asks | `components/home/{LandingProvider,LandingAddButton,QuestLog}.tsx`, `lib/landing.ts#parseAddIntent` |
| Quest Log | #quests after sign-in: add 3 shows inline, open the Airing Schedule, copy the list link; the slime evolves (Named Slime → Demon Slime at 3 → Demon Lord at 10) | Real list count only; Quest 2/3 flags in localStorage per user, also set by opening your own Airing Schedule and by any list-link copy (`components/theme/ShareLink.tsx`); status messages derived from state | `components/home/{QuestSection,QuestLog,questStore}.ts(x)`, `lib/landing.ts#evolutionTier` |
| Errors | Friendly error/404 pages with retry; the season page's is themed (its banner, "《Warning》 Couldn't load Fall 2026.", Retry / Current season / Search) | `app/error.tsx`, `global-error.tsx`, `not-found.tsx`, per-route `error.tsx` (season, top anime, both Next 16.3's `retry()`). Retry must refetch the server render: `retry()`, or `router.refresh()` + `reset()` (`reset()` alone re-shows the error) | |

---

## 5. Data flows

### 5.1 Season page `/anime/2026/fall`
1. `proxy.ts` validates the slug with `seasonRouteRedirect()` (pure, `lib/season.ts`) and 307s if needed.
   The page is static ISR like `/` and `/topanime`: no request APIs and **no `loading.tsx`** (§9.15);
   `app/anime/layout.tsx` is only `<main>` + `HeaderProvider` (sort + continuing toggle, so they
   survive season navigation). Everything else, banner included, is `PageBase`.
2. `Boundary.tsx` → `getAniListData({page:1, withCarryOver: true})`. It returns
   `{ok, media, hasNextPage, carryOver, carryOverIncluded, carryOverCapped}` and never throws. The same single request also asks for
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
   failure shows `error.tsx` (themed, Next 16.3 `retry()`). A successful empty result (e.g. a
   far-future season) renders the "No shows here yet" panel. `carryOverIncluded: false` (the
   season-only fallback ran) makes the page claim nothing about continuing series and re-fetch them
   once from the browser (step 4); `carryOverCapped` (a carry-over list hit 50) turns counts into "21+".
3. `PageBase` (client) keeps one `media` array (deduped by id, popularity order) plus a
   `{nextPage, hasNextPage}` cursor. The visible list is derived with `useMemo` from `media` and the
   sort mode. The first 12 cards are in the SSR HTML.
   Pages 2–6 load right after hydration in **both** sort modes (`EAGER_SORTS`), not on scroll:
   the count, the end card and the Next-episodes card need every page. When a later page lands,
   the cards **on screen or scrolled past** (plus a focused card) are **pinned** (`PIN_SCOPE`,
   `pinnedOnScreenIds`), and the rest are sorted in behind them, so nothing the reader can see
   reshuffles. In countdown mode, if shows behind the pins air sooner than a pinned one, a Great
   Sage divider sits at the seam ("2 shows below air sooner than some above.") with **Re-sort**.
   The seam is after the pinned ids still present (`orderSeason`'s `pinnedCount`). Changing the
   sort or the continuing toggle re-sorts everything. A later page that repeats a loaded show
   (AniList's order moved between requests) keeps the counts at "N+" and the end card says so.
   Continuing series merge into both sorts ("By Popularity" uses AniList's `popularity` count).
   They are deduped against later season pages and hidden by the `showContinuing` toggle in
   `HeaderContext`, which also re-sorts.
   Countdown order counts only episodes airing **within the browsed season**, ties broken by
   popularity, so past and upcoming seasons don't open with today's long runners. In popularity
   mode, carry-overs less popular than every loaded season show wait until the season's later
   pages load. Ordering and pinning are pure and tested in `lib/anime/seasonOrder.ts`; every
   string (and when it shows) in `lib/anime/seasonCopy.ts`.
4. Pages 2+ are fetched in the browser. Refs guard against double fetches; a failure shows an inline
   Retry (keyboard focus moves to the first new show on success), and the season is never silently
   truncated. The page speaks through **one** sr-only `role="status"`: scroll-started loads, load
   results, sort/toggle changes, Re-sort and the refresh below; eager loads and reveals are silent.
   **Stale ISR pages.** ISR serves the first visit after a quiet spell the last render, while Next
   rebuilds it in the background. `getAniListData` stamps `fetchedAt`, and Boundary passes it on.
   If the page's data is over 10 minutes old (`components/animev3/utils/seasonFreshness.ts`), or
   the server's request fell back without continuing series,
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
   The banner, sort hint, end card and empty states use the data's fetch time until the per-minute
   clock runs (`useSeasonPhase` = `useMinuteNow() ?? fetchedAt`), so the static HTML hydrates
   cleanly and a stale page doesn't mislabel the season's phase or year window.
   **Navigation.** Season tiles prefetch only on intent and show a pending spinner
   (`LinkPendingGlyph`, `useLinkStatus`): without `loading.tsx` the old page stays until the new one
   arrives. After a client navigation Next focuses the new segment's first element; `PageBase`'s
   root is deliberately not focusable, and `SeasonNav` has already focused the same tile (a one-shot
   token from `onNavigate`, `season/seasonFocus.ts`; Back/Forward never set it).
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
// Rules (normalizeUserData): progress clamps to a known episode count; a +1 (progress with no
// status in the request) on a planning/paused show moves it to watching; reaching the last episode
// auto-completes watching/planning shows, unless the request explicitly changed status (rewatch);
// completing fills progress; start/finish dates auto-fill once. The edit dialog always sends a
// status, so the +1 move never applies to its saves; auto-complete still does when the status it
// sends is unchanged.
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
| React context | `HeaderContext` (season sort mode + continuing toggle), under `app/anime/layout.tsx` | |
| Local state | My List (`MyList.tsx`), Top Anime list, season `PageBase` (pins, cursor, refresh state), the details sheet (`useAnimeDetails`) | |
| Module memory | `app/topanime/rankingStore.ts` · `components/animev3/utils/seasonFreshness.ts` · `components/animev3/season/seasonFocus.ts` | Top Anime's loaded pages for the tab, keyed by page 1's ids; restored on the next client visit (Back from Track) · a season's browser refresh, so Back/Forward doesn't refresh again · a one-shot focus token for season navigation (10 s) |
| Shared clocks | `useNow()` (1 s, countdown leaves only) · `useMinuteNow()` (per minute: "today", season phase) | `useSyncExternalStore`; one interval each for the page. `useMinuteNow` reads null again once nothing subscribes, so a later mount renders its fallback first |
| Mongo | `listRefreshedAt` | Refresh lock/throttle |
| sessionStorage | `kv:add-intent` | Landing sign-in intent `{id, status?, at, media}`; auto-add only within 15 min, consumed once |
| localStorage | `kv:quests:<userId>` (Quest 2/3 flags), `kv:live-timers` (pause live timers) | Per device; read via `useSyncExternalStore`, every access in try/catch |
| URL query | `/user/<id>?shelf=&sort=&q=&year=&season=&day=&release=`, `/mylist/<id>?day=` | The list/schedule view; defaults omitted; `replaceState` only (no history entry per keystroke) |

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
  anime/airing.ts             nextAiring, countdown formatting, premiereAiring/premiereLabel (AniList's earliest schedule node
                              counts only when it is EP 1 or the show hasn't aired), isPremiereNext, airingWeekday (PT), compareByNextAiring
  anime/seasonOrder.ts        the season page's ordering: countdown (within the season) / popularity, continuing series,
                              orderSeason (pinned prefix + pinnedCount), soonerBelow (the divider), pinnedPrefixLength
  anime/seasonCopy.ts         every season-page line and its condition (Sage lines, scope, counts, hint, divider, end card,
                              empty states, status messages, meta description); SEASON_EYEBROW, MAGIC_SENSE_LINE
  anime/cardLabels.ts         AnimeCard / details-sheet labels (status chip, meta line, genres, facts, links, sheet results)
  anime/statusBadge.ts        STATUS_BADGE_CLASS / STATUS_DOT_CLASS (list-status colors)
  anime/trackerConsole.ts     the Great Sage tracker lines (+1, status, score, edit diff), shared by TrackerDemo and My List
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
  animev3/                    season browser: PageBase (the page's client root), layoutSelector/HeaderProvider (sort +
                              continuing context), utils/ (getAniListData, useLazyLoad, seasonFreshness, jinkanData/)
    season/                     SeasonBanner (minute-clock leaf) → SeasonHeader (PageBanner + SeasonNav, also error.tsx),
                                SeasonNav + SeasonLink (intent prefetch, focus token), SeasonControls (+ SortHint),
                                SeasonGridNotices (OrderDivider, LoadMoreError, SeasonEndCard), SeasonEmpty, useSeasonPhase
  mylist/                     Airing Schedule UI (week panel, NextEpisodes card) + schedule.ts (grouping)
  common/                     NavBar, AnimeBar (nav links), NavSearch, LogInBox (account menu)
  animev3/ListToggle.tsx      the shared add/remove toggle (every card); ListToggleAction = AnimeCard's full-width version
  theme/                      the Tempest design kit for every page (guide: .claude/skills/tempest-theme):
    tokens.ts                   class tokens (focus rings, containers, ANIME_GRID / INFO_GRID + cover sizes, the classic card's INFO_*,
                                type, panels, cards, buttons, fields, shelves)
    cardLayout.ts               ANIME_CARD_LAYOUT ("classic" | "poster"): the one switch for the season page, /search and
                                the landing's Magic Sense (CARD_LAYOUT bundles card, skeleton, action, grid, sizes, spans)
    AnimeInfoCard, AnimeInfoCardSkeleton  the classic card (owner's layout, gel surface, Magic Sense HUD, readout, synopsis well,
                                perched slime, MAL/AniList/Crunchyroll glyphs); fixed-height regions, so the skeleton matches
    AnimeCard, AnimeCardSkeleton  the poster card (switchable; the Quest Log's `compact` always); `Action` injects the page's
                                add control; AnimeGridCardProps is shared by both cards
    AnimeDetailsDialog          useAnimeDetails(): one 《Analyze》 sheet per page (native modal <dialog>, own status line)
    LinkPendingGlyph            a link's arrow that becomes a spinner while its navigation is pending (useLinkStatus)
    dialog.ts                   isBackdropEvent (EditEntryDialog, the details sheet)
    PageBanner                  night-sky app-page header (eyebrow, SageLine, h1, actions, aside; asideClassName)
    StatGrid, icons             the stat dl (My List, Top Anime); TrophyIcon, CrownIcon, StarIcon
    EvolutionCard, SagePanel    the evolving slime card; themed empty/error states
    ShareLink, LiveTimersToggle share strip (owner, or a signed-out placeholder) + useCopyListLink; the timers pause button
    NextEpisodeLine             a tracker card's countdown / release-status line (ListCard and TrackerDemo)
    NewEpisodesChip             "2 new": aired episodes not logged (lib/anime/airing.ts#unloggedAired)
    consoleToast                the Great Sage console as one replacing toast (visual only; pages speak the line)
    AniListCover                an AniList cover as a srcset of AniList's files (100/230/460px): each screen gets the sharpest
                                one it needs, up to AniList's largest upload (next/image can't, being unoptimized). Used by
                                both anime cards and the details sheet
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
                              useMyList, useNow (1 s), useMinuteNow (per minute: "today" labels)
styles/globals.css          Tailwind layers, scrollbar, the landing's CSS-only rules (reveal, parallax, slime face hooks, .js-only),
                            the "Classic anime card" section (.gel-*, .site-glyph masks over public/assets/site-glyphs.webp)
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
    List layouts also need `min-w-0` through their grids/flex containers. The Airing Schedule's week
    panel keeps its 8 tab columns down to 320px; its rows wrap titles (2 lines) and status lines
    instead of truncating. Keep metadata columns shrinkable.
14. **Never use `server/lib/anilist.ts#anilistQuery` on static or ISR pages.** Its `cache: "no-store"`
    makes the route dynamic, and every view would call AniList. Use `getAniListData` (default fetch
    cache) or a `force-cache` fetch through `enqueueAniListRequest`, as `server/lib/landing.ts` does.
15. **The landing is static: nothing on the server may know the visitor.** No `cookies()`,
    `headers()`, `searchParams` or `getServerSession` in `app/(home)`; session UI goes through
    `useLandingSession()` and renders a same-size placeholder while it loads. Don't add a
    `loading.tsx` to `app/(home)`: the page is async, so the static HTML would ship the fallback and
    hide the whole landing in a `<div hidden>` until JavaScript swaps it in (no-JS visitors and the
    H1's LCP both suffer). `/topanime` and the season pages are the same (static ISR, async page):
    no `loading.tsx` there either (`npm run build`, then every `.next/server/app/anime/*/*.html` has
    one `<h1>`, no `<div hidden id="S:` and no `<!--$?-->`). Their client roots render the whole
    page, and a root element that Next would focus after a navigation must stay non-focusable.
16. Tailwind scans `app/`, `components/` and `lib/` (`tailwind.config.js` `content`). Class maps
    shared from elsewhere (e.g. `lib/anime/statusBadge.ts`) are silently dropped from the CSS unless
    their folder is listed there.
17. **Motion intentionally ignores the OS reduced-motion preference** (landing and every
    Tempest-themed page). Use ordinary animation/transition utilities, not `motion-safe:` or
    `motion-reduce:`. Keep offscreen pausing and the explicit "Pause live timers" control.
18. **Redesigns use the Tempest theme** (`tempest-theme` skill). Landing demos must match the
    real pages they advertise: `TrackerDemo` ↔ My List's card, `ScheduleDemo` ↔ the Airing
    Schedule's week panel, `HeroNextUp` ↔ `NextEpisodes` (the Airing Schedule's and the season
    banner's), the Magic Sense chapter ↔ the season page (the same card via `CARD_LAYOUT` and the same
    details sheet, `SEASON_EYEBROW` / `MAGIC_SENSE_LINE` from `lib/anime/seasonCopy.ts`; the Quest Log
    keeps the compact poster card on purpose: a 4-up picker, not a demo), and SageSearch's Top
    Anime doorway ↔ `/topanime`'s banner sub (the same promise: highest-ranked shows, each with a
    Track shortcut). Change both sides together. In-page jump links use next/link or a button, never a
    plain `<a href="#…">`: a native fragment entry has no router state, so a later Back changes the
    URL but not the page.
19. **Season counts and "none" claims carry the lineup's scope.** The season query leaves out ONAs,
    TV shorts and adult titles, so a total says so in the same sentence ("All 72 Fall 2026 shows
    sensed, excluding ONAs, TV shorts and adult titles.") and an empty state is about the page ("No
    shows here yet. This page skips …"), never "AniList lists no …". Counts that may be partial say
    "50+" / "at least 50". `lib/anime/seasonCopy.ts` holds them all, with a truth-sweep test.
20. **A modal makes the page's status line inert.** `showModal()` puts everything outside the
    `<dialog>` behind the backdrop, toasts included, so a dialog that changes something speaks its
    own result (the details sheet has its own sr-only `role="status"`; `ListToggle`'s `onResult`).
21. **Class strings a server component renders come from a non-client module** (`tokens.ts`). A
    string imported from a `"use client"` file is a client reference on the server, so its classes
    break (the server-rendered `/search` loading skeleton uses the classic card's tokens).

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
- `useMyList`'s add/remove toasts render dimmed behind an open details sheet and aren't spoken
  (the sheet says "Couldn't add it to your list. Try again." itself; a specific reason such as
  "list is full" is only in that toast). A top-layer or visual-only toaster would fix it site-wide.
- The landing's Next-episodes card picks from the season's 30 most popular shows, so it can differ
  from the season banner's (which uses every show).
- Season tiles prefetch only on intent, so a first tap on a phone waits for the fetch (the pending
  spinner covers it). Links to `/anime` elsewhere (nav, "Browse this season") rely on Next's
  default prefetch, which serves the redirected season (≈0.1 s on `next start`); there's no
  loading UI if a click beats it.
- `/search` overflows by 24px at 360px and below: the NavBar is wider than the screen there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
