# CLAUDE.md — kyle-anime (kylevb.com)

An anime **season browser + personal watchlist tracker**. Browse every anime premiering in a season
(live per-episode countdowns, sort by countdown or popularity), search all of AniList, sign in with
Google, add shows to a list, and track status, episode progress, score and dates. Lists are public by
link; only the owner can edit. The landing page (`/`) sells all of it with live data, a no-sign-in
tracker demo and a post-sign-in Quest Log. Production: https://kylevb.com (Vercel).

- **Stack:** Next.js 16.3 App Router (Turbopack) · React 19 · TypeScript · Tailwind 3.4 · NextAuth v4
  (database sessions) · MongoDB native driver 4.x · SWR · react-hot-toast · Vitest
- **Data sources:** [AniList GraphQL](https://graphql.anilist.co): seasons, search, list refresh.
  **Rate limit ≈ 30 req/min** (read `x-ratelimit-remaining`).
  [MyAnimeList API v2](https://myanimelist.net/apiconfig/references/api/v2): the "Top Anime" ranking
  only, server-side with the app's Client ID (no published rate limit). It replaced Jikan, which
  shut down in October 2026.
- **Checks:** `npm run check` (typecheck + lint + unit tests). There is no CI build.
- **Design:** every page redesign uses the landing's "Tempest" theme. Load the `tempest-theme`
  skill (`.claude/skills/tempest-theme/SKILL.md`) first; shared pieces live in `components/theme/`.

---

## 1. Commands

```bash
npm ci               # install exactly what package-lock.json pins
npm run dev          # next dev on :3000 (also re-adds the Next.js agent-rules block at the end of this file)
npm run build        # prerenders 28 season pages, /topanime and / by calling AniList/MyAnimeList (needs network)
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
| `MAL_CLIENT_ID` | `/topanime` and `/api/top-anime` (and so the build) | Server-only, sent as `X-MAL-CLIENT-ID`; never `NEXT_PUBLIC_`. Missing → the ranking throws (the build fails) |
| `MAL_CLIENT_SECRET` | – | Set, but unused: public data needs only the Client ID (the secret is for user OAuth) |
| `MAL_API_URL` | optional | Falls back to `https://api.myanimelist.net/v2` (the test rig points it at a stub) |

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
   │                       /topanime ........... ISR 3600s ─ server/lib/myanimelist ─────► MyAnimeList
   │                       /api/top-anime ...... route handler (CDN 1 h) ────────────────► MyAnimeList
   │                       /search ............. dynamic ─── server/lib/anilist ─────────► AniList
   │                       /user/<id>, /mylist/<id> dynamic ─ server/lib/userList ──┬────► AniList (stale refresh)
   │                       /api/anime-list/* ... route handlers ────────────────────┤
   │                       /api/auth/* ......... NextAuth (MongoDBAdapter) ─────────┴────► MongoDB
   │                       /user/og/<id>/<v>, /mylist/og/<id>/<v> ISR 3600s ─ userList#readListCard ─► MongoDB (no AniList)
   ├─ pages 2+ of a season ───────────────────────────────────────────────────────────────► AniList
   └─ Top Anime "Show more" ──────────────────────────────────────────────────► /api/top-anime
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
| `/search?q=&format=&genre=&year=&season=&release=&page=` | `app/search/{layout,page,SearchBanner,FilteredSearchConsole,SearchResults,SearchPagination,SearchPanels,SearchPending,SearchPendingStatus,SearchArrival,SearchStatus,SearchTitle}.tsx`, `components/theme/{SearchConsole,ConsoleFrame,SageDoorway,FilterSelect}.tsx`, `lib/{search,searchFilters}.ts`, `lib/anime/{searchCopy,searchConsoleCopy,releaseStatus}.ts` | dynamic; deliberately no `loading.tsx` (§5.4) | – | Search (Skill 04 · Great Sage): AniList title search, narrowed by optional filters (format, genre, year, season, release status), 30/page, up to page 50 (§5.4) |
| `/topanime` | `app/topanime/{page,TopAnimeShell,TopAnimeBanner,GlanceStats,CrownConsole,AboutRanking,TopAnimeList,TopAnimeRow,ranking,rankingStore,loadTopAnimePage,error}.ts(x)`, `lib/topAnime.ts`, `server/lib/myanimelist.ts` | **ISR 3600s**; no `loading.tsx` (§9.15) | – | MyAnimeList's ranking (official API): the Octagram (ranks 1–8) + the ranking; "Show more" appends; Back restores loaded pages; "Track" → `/search?q=` |
| `/auth` | `app/auth/page.tsx`, `components/auth/SignOutButton.tsx`, `components/theme/CardPage.tsx` | dynamic; no `loading.tsx` in `app/auth` (§9.6, §9.15) | session | Account card (a Tempest card page): avatar (the photo over the owner's initial), 《Notice》 Signed in as + name, "Your lists" link cards (My List, Airing Schedule), Sign out (without JavaScript: NextAuth's own sign-out page). Signed out → `/auth/signin` (307, before streaming) |
| `/auth/signin` | `app/auth/signin/page.tsx`, `components/auth/signIn/{SignInActions,SignInSlime}.tsx`, `components/auth/{GoogleButton,GoogleIcon}.tsx`, `lib/signIn.ts` | **static** (○); no `loading.tsx` (§9.15) | – | Custom NextAuth sign-in page ("Naming"): the slime, h1 and subhead are server HTML, the action slot is the only client island. Honors same-origin `?callbackUrl`; explains `?error=` (a 《Warning》 box and a worried slime; SessionRequired a 《Notice》); already signed in: the Named Slime and "Naming complete.", then the redirect |
| `/user` | `app/user/page.tsx` | dynamic | – | → `/user/<your id>` or sign-in |
| `/user/<userId>` | `app/user/[...user]/*`, `app/user/_client/*` | dynamic | **public read, owner edits** | **My List**: the full tracker (§5.3); link previews: §5.8 |
| `/user/og/<id>/<v>` | `app/user/og/[id]/[v]/route.ts`, `components/og/{ListShareImage,OgSky,parts,fonts,shareCard}.ts(x)` | runtime ISR 3600 s (`force-static`, `generateStaticParams → []`) | public | My List's link-preview image (1200×630 PNG, §5.8). 404 for non-canonical ids, unknown lists and a malformed `v` |
| `/mylist` | `app/mylist/page.tsx` | dynamic | – | → `/mylist/<your id>` or sign-in |
| `/mylist/<userId>` | `app/mylist/[...user]/*`, `components/mylist/*` | dynamic | public read | **Airing Schedule**: list shows with an upcoming episode, by weekday (PT); link previews: §5.8 |
| `/mylist/og/<id>/<v>` | `app/mylist/og/[id]/[v]/route.ts`, `components/og/{ScheduleShareImage,OgSky,parts,fonts,shareCard}.ts(x)` | runtime ISR 3600 s | public | The Airing Schedule's link-preview image (§5.8); same 404s |
| `/api/anime-list` | `app/api/anime-list/route.ts` | – | session | `POST {data: media, status?}` add · `DELETE {data:{id}}` remove |
| `/api/anime-list/ids` | `app/api/anime-list/ids/route.ts` | – | session | `GET` → `{ids}` on the caller's list (401 signed out) |
| `/api/anime-list/<animeId>/user-data` | `app/api/anime-list/[animeId]/user-data/route.ts`, `server/lib/userDataWrite.ts`, `lib/anime/userDataRequest.ts` | – | session | `PATCH` one of four bodies: `{userData}` (Edit: absolute) · `{userData, expect}` (Undo: only while the entry still equals `expect`) · `{increment: 1–100}` (+1 taps, added to the **stored** progress) · `{catchUpTo}` ("Log N new": never past what has aired by the server's clock). → `{message, userData, previous}` (`previous` = the stored value it replaced); 409 `{error, code: "changed", userData}` (Undo's entry changed) or `{error, code: "busy"}` (lost the compare-and-set 3 times) |
| `/api/anime-list/user/<userId>` | `app/api/anime-list/user/[userParam]/route.ts` | – | public | `GET` → `{list}` (refreshes stale airing data) |
| `/api/top-anime?page=` | `app/api/top-anime/route.ts` | – | public | `GET` → `{page}`: one 25-show page of MAL's ranking for "Show more" (the browser can't call MAL: no CORS, and the Client ID stays server-side). Cached 1 h at the CDN only (Next's data cache would serve a stale page of any age); one MAL attempt per request, and the instance pauses after a failure; 400 bad page, 429 (MAL's wait in Retry-After), 502 |
| `/api/auth/*` | `app/api/auth/[...nextauth]/route.ts` | – | – | NextAuth |

`app/robots.ts` keeps search crawlers off `/search` (each hit costs an AniList request), list pages,
`/api` and `/auth`. A second group lets the link-preview bots that honor robots.txt
(`lib/previewBots.ts#ROBOTS_PREVIEW_BOTS`: Twitterbot, facebookexternalhit, Discordbot, LinkedInBot,
TelegramBot, WhatsApp) read list pages and their images (§5.8). It was added from the bots' docs,
not measured against them: drop that group to keep list pages closed to every crawler but Slack.

**List URLs use the owner's Mongo ObjectId.** Old `/<route>/<base64url(email)>` links still work
**only for their signed-in owner**, who is redirected to the id URL. Everyone else gets a 404, so
emails are never exposed or enumerable (`server/lib/userList.ts#resolveListOwner`).

**Nav** (`components/common/NavBar.tsx` (server), `AnimeBar.tsx`, `NavSearch.tsx`, `LogInBox.tsx`,
`SkipLink.tsx`, `FocusNudge.tsx`; classes in the "Site chrome" section of `components/theme/tokens.ts`):
"Skip to content" (the first Tab stop, visible only on focus) · Home · カイル and Seasons
(→ `/anime`) · Top Anime · search box (GET `/search`, landmark "Site search") · Log in **or** avatar
menu {My List, Airing Schedule, Lift Tracker (external), Sign out}. Tempest look: the top edge of
the night sky (it ends in `#050915`, the banners' first color), static stars in the empty middle
from 1024px, a moonlit hairline. The owner's full-height pills fill with slime gel on hover; the
current page gets a sage underline (a border, so forced colors keeps it; the brand is never
current). A static 20px slime marks カイル at 360–639px and from 820px (the 640–819 bar has no room
for it); on phones the brand's name is "カイル Seasons". The loading placeholder (a static ring),
Log in (a round gel pill) and the avatar share one box (48×48, 63×63 from 640), so the bar never
shifts when the session resolves. The menu is a Great Sage console ("《Notice》 Signed in as <full
name>.") that marks the item for the current page (● + `aria-current`). The nav is `z-40`, above
the landing's StickyCta. Keyboard focus never ends up under it: `FocusNudge` scrolls the window by
the overlap (WCAG 2.4.11, §9.22). **Footer** (`components/common/SiteFooter.tsx`, server, a direct child of
`<body>`): the forest floor (NightSky's `Treeline`, mirrored so it never repeats a banner's forest
tree for tree, + a static slime), the AniList / MyAnimeList
credits as a `《Report》` line, "Top anime" and "Search" (`prefetch={false}`).

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
| Search | Night-sky banner (Skill 04 · Great Sage), the owner's layout. Home: 《Question》 "What anime are you looking for?", "Search anime", the landing's framed console (visible label, Analyze, "Try:" chips Tensura / Sousou no Frieren / Cowboy Bebop / Kimi no Na wa / Mushishi, the 《Question》 "Just want what's airing?" doorway to `/anime`). Results: the compact box on top with a Filters toggle (count badge; with filters applied, from 1024px the panel is always shown instead): My List's selects for Format · Genre · Year · Season · Release status, Apply filters, Clear filters; a literally true 《Report》 ("54 results, excluding adult titles. This is the last page." / "More than 30 results. The closest come first." / "Page 2: results 31–60. More follow."; with filters every count and "none" names them: "2 TV results from Fall 2026, excluding adult titles."), "Results for “q”", a sub that lists the filters ("Filters: TV, Fall 2026."), the Results row (count, Pause timers), the season page's card + details sheet, ← Previous · Page N · Next →, a visible page-50 note; SagePanels for no results, past the last page, AniList down, rate limited (AniList's Retry-After when sent). While AniList answers: "《Analyze》 Searching AniList… The closest matches come first." and skeleton cards; text typed into the box meanwhile survives | One `searchAnime` per render (`cache()`d for the report and the results; asks `hasNextPage` only, so exact totals exist only on the last page: `lib/search.ts#resultWindow`); every line in `lib/anime/searchCopy.ts` (truth-swept); one status line in the layout + a one-shot focus token (`components/utils/searchArrival.ts`, keyed by the canonical URL); nothing prefetches a search (consoles, chips, pager, results); the console, chips and frame are the landing's (§9.18). Filters: `?format=&genre=&year=&season=&release=` matched exactly in `lib/searchFilters.ts` (slugs; My List's season and release values; bad values dropped, never sent); optional GraphQL variables on the same one request (year + season = AniList's season filing, a year alone = the start year); never a search without `q`; no auto-submit; `FilteredSearchConsole` fills `SearchConsole`'s `toggle`/`children`/`hrefFor` slots | `app/search/*`, `components/theme/{SearchConsole,ConsoleFrame,SageDoorway,FilterSelect}.tsx`, `lib/{search,searchFilters}.ts`, `lib/anime/{searchCopy,searchConsoleCopy}.ts`, `server/lib/anilist.ts` |
| My List | Night-sky banner (Skill 02 · Predator): "N still airing, M with new episodes", stats (shows, watching, episodes seen with "≈ N days of runtime" from 640px, mean score), copy link, the owner's Evolution slime (gulps when a show completes); shelves All/Watching/Plan to Watch/Completed/Paused/Dropped with counts (one scrolling row on phones); search + "Sort & filter" (phones) / sort + filters (text, year, season, airing day PT, release status); sort (next episode, new episodes, title, my score, progress, recently added); the landing tracker demo's card; +1 never blocks: taps made while a save is in flight keep counting and go out as one request, with one Great Sage line per burst ("Episodes 14–16 logged for … 10 to go."); the owner's "N new" chip (aired, not logged; Watching/Paused) is a "Log N new" button; after a confirmed change "↶ Undo +N" takes the date · score line's place for 10 s (paused while a mouse or pen is over the card, focus is anywhere in the card or the tab is hidden; restores the exact previous status, progress, dates and score, even after an auto-complete; afterwards keyboard focus goes to the card's Edit); a card being tapped holds its place (and section) until the shelf, sort or filters change; a Great Sage console toast for every burst, undo and save (a worried slime for a failure) | One client root with local state; the view lives in the URL (`?shelf=&sort=&q=&year=&season=&day=&release=`, read with `useSearchParams`, written with `replaceState`); owner-only +1, catch-up, Undo and the Edit dialog (status pills, progress, score, start/finish dates, remove; sticky Cancel/Save); the +1 engine is `lib/anime/trackQueue.ts` (one `TrackQueue` per page: confirmed value, one request in flight, a merged queue, bursts, Undo streaks; relative requests only); `placeHeld` files held cards by their held userData; PATCH → server-normalized `userData`; tracker lines from `lib/anime/trackerConsole.ts` (toast visual only, spoken through one sr-only status); background `router.refresh()` 2 s after edits. No profile photo | `app/user/_client/{MyList,ListCard,EditEntryDialog,listFilters,editForm,api}.ts(x)`, `lib/anime/{trackQueue,userDataRequest}.ts`, `components/theme/{UndoButton,NewEpisodesChip}.tsx` |
| Tracker rules | +1 on Plan to Watch/Paused moves the show to Watching; auto-complete at the last episode; dates auto-filled; score rounded; a +1 or catch-up is applied to the stored value, and a catch-up never logs past what has aired | Enforced on the server (compare-and-set write) | `lib/anime/normalize.ts#normalizeUserData`, `lib/anime/userDataRequest.ts`, `server/lib/userDataWrite.ts` |
| Airing Schedule | Night-sky banner (Skill 03 · Thought Acceleration) with the hero's Next-episodes card; the landing demo's week panel: tabs All + Mon…Sun (count dots, today ringed), opening on today or the next day with shows ("The whole week" on the Next-episodes card opens All); countdown rows with list status/progress and the "N new" chip (visitors see whose, and get + Add); a day-aware Great Sage line ("Now airing…", "Today: 2 episodes left, the next at 7:30 AM PT."); share strip and "Not airing right now" in a side column for the owner, below the panel for visitors | SWR `/mylist/<id>` (fallbackData from SSR, poll 60 s); dropped/completed excluded from the schedule; `renderedAt` from the server picks "today" and the banner line until the per-minute clock (`useMinuteNow`) hydrates; the selected tab lives in `?day=` | `components/mylist/{AiringSchedule,NextEpisodes,NotAiringList,schedule}.ts(x)` |
| Air-date freshness | Countdowns roll to the next episode | Server-side refresh of stale snapshots on list read (§5.5) | `server/lib/userList.ts` |
| Top Anime | Night-sky banner (Rankings · The Octagram) with the fetch time, a "top 25 at a glance" (640px+) and #1 with its lead over rank 2 on a magic circle (1024px+); the Octagram (ranks 1–8: gold sigils, crowned #1), then one row design for every rank (rank + score rail, poster, titles, type · eps · year, members, Track); a Great Sage Show-more console; an About panel. MAL's ranking has one show per rank; its list ends where the unranked entries begin (about #22,900), and Rx (adult) entries are left out. Pages are cached separately, so a show that crosses a page boundary is deduped and nothing on the page calls two shows at one rank a tie | Page 1 server-rendered from MAL's API (`server/lib/myanimelist.ts`; fresh in every ISR render, but `next build` may reuse a copy cached by a build up to 1 h earlier, so the banner's "fetched" time is MAL's own Date header; throws on failure); later pages from the browser one at a time through `/api/top-anime` (in-flight guard, dedupe, inline Retry, focus to the first new row, sr status; errors say whether MAL or the reader's connection failed, with MAL's Retry-After); module snapshot of loaded pages (`rankingStore`); `.js-only` button + `<noscript>` MAL link. MAL's response is parsed in `lib/topAnime.ts` (ranking position, not the show's lagging `rank` field; WebP covers; tested). Every stat and sentence is computed from loaded items (`ranking.ts`, unit-tested) | `app/topanime/*`, `app/api/top-anime/route.ts`, `lib/topAnime.ts`, `server/lib/myanimelist.ts`, `components/theme/{StatGrid,icons}.tsx` |
| Share images | A shared `/user` or `/mylist` link unfurls with the visitor banner at 1200×630: My List's Sage line, h1, sub, four stats and the evolving slime on its magic circle; the schedule's week strip (All + Mon…Sun counts) with the tier slime perched on it. First name only (Arabic, Hebrew, Indic and Thai names: "Anime list" / "this list") | Stored data only (one projected `findOne`, no session, no AniList, no clock); the card's hash (`v`) is in the path, so a changed list gets a new URL; runtime ISR 1 h; preview bots' page views skip the AniList refresh; fonts bundled in `assets/og` | `components/og/*`, `lib/anime/listCopy.ts`, `lib/previewBots.ts`, `server/lib/userList.ts#readListCard`, `app/{user,mylist}/og/[id]/[v]/route.ts` |
| Landing | Hero (H1 is the LCP), live "Next episodes" card, 5 live countdown cards (the season page's card via `CARD_LAYOUT`, opening the same details sheet; 7 in the poster layout) with exact season count, sticky CTA, FAQ, post-credits | Static ISR page + client islands; one `LandingProvider` (media by id, `useVisibleAiring`, the intent dialog); original inline-SVG slime mascot (no official art traced) | `app/(home)/page.tsx`, `components/home/*` |
| Landing session slots | "Start my list" (straight to Google, `callbackUrl` `/#quests`) · "Open My List" · "Add my first shows", with same-size skeletons while the session loads | `useLandingSession()` (session + `useMyList().count` + tier); `SessionCta` / `SessionStatusLine` fixed boxes; `<noscript>` sign-in link | `components/home/{useLandingSession,SessionCta,StickyCta}.ts(x)` |
| Tracker demo | "+1" to the finale auto-completes, statuses, score, dates, "Log 2 new", "↶ Undo +N"; one console line per burst; nothing is saved | My List's own engine (`TrackQueue`) against an in-memory `DemoServer` that applies `lib/anime/userDataRequest.ts` (the route's rules); the pills and score adopt `normalizeUserData`'s result; its console lines come from `lib/anime/trackerConsole.ts` (shared with My List); the chip and countdown line use the real show's schedule | `components/home/TrackerDemo.tsx` |
| Sign-in intent | Signed-out "+ Add to list" / "+ Plan to Watch" opens "Sign in to add {title}"; after Google the show is already on the list | `ListToggle` `onSignedOutAdd` → `LandingProvider` dialog → sessionStorage `kv:add-intent` (15 min) → `/?add=<id>#quests` → `QuestLog`'s `AddIntentHandler` adds once; a bare link only asks | `components/home/{LandingProvider,LandingAddButton,QuestLog}.tsx`, `lib/landing.ts#parseAddIntent` |
| Quest Log | #quests after sign-in: add 3 shows inline, open the Airing Schedule, copy the list link; the slime evolves (Named Slime → Demon Slime at 3 → Demon Lord at 10) | Real list count only; Quest 2/3 flags in localStorage per user, also set by opening your own Airing Schedule and by any list-link copy (`components/theme/ShareLink.tsx`); status messages derived from state | `components/home/{QuestSection,QuestLog,questStore}.ts(x)`, `lib/landing.ts#evolutionTier` |
| Errors | Card pages on the night sky (`CardPage`: the owner's centered card as a Great Sage console): the 404 (a worried slime perched on "404", "This page got isekai'd", 《Warning》, This season / Search / Home); the error page (the worried slime over the owner's table flip, 《Warning》, Error ID, Try again / Home, its own `<title>`); the fatal error (a self-contained night-sky document: worried slime, 《Warning》, Error ID, Try again, Home as a full load). The season and Top Anime errors are themed inside their banners ("《Warning》 Couldn't load Fall 2026.", Retry / Current season / Search) | Retry is Next 16.3's `retry()` (`reset()` alone re-shows the error; or `router.refresh()` + `reset()`). `RetryButton` ("Try again" / "Trying again…", `aria-disabled`) returns focus after a failed retry (a 10 s module token). `error.tsx` and `global-error.tsx` ship on every page: the error page's sky and slime load lazily (`ErrorDecor`; a failed import renders nothing), and global-error inlines its CSS and slime (slimeArt). Both render in the browser only (the server sends an empty `__next_error__` shell). The error page keeps its `<title>` first in `<head>` while mounted (React hoists the newest title first, and a client navigation's metadata title mounts after it). The list routes title their 404 "Page not found" | `app/{not-found,error,global-error}.tsx`, `components/theme/{CardPage,RetryButton,ErrorDecor}.tsx`, per-route `error.tsx` (season, top anime) |
| Sign-in & account | `/auth/signin`: the owner's card on the night sky: the slime (worried next to a 《Warning》, the Named Slime with "Naming complete." when already signed in), "Sign in", Google's light pill button, `?error=` as a rose 《Warning》 box (SessionRequired: a sage 《Notice》), and "《Report》 Signing in needs JavaScript on this site." without JS. `/auth`: the avatar (photo, or the initial on slime gel), 《Notice》 Signed in as, the name, the My List / Airing Schedule link cards, Sign out | A static sign-in page with one island (`SignInActions`): the three slimes are server HTML switched by CSS `:has([data-slime])` (no client JS); rules and lines in `lib/signIn.ts` (tested: the Map lookup, same-origin callback paths); one spoken channel (a persistent `role="status"` or the alert); `aria-disabled` + guards keep focus while pending; no `next/image` on either page (plain `<img>`; the photo stacks over the initial, so a broken photo needs no JS). `GoogleButton` is also the landing dialog's; `GoogleIcon` is a client leaf with a statically imported PNG (a server-rendered `<img>` becomes an RSC preload hint, and the nav's prefetch of sign-in would make every signed-out page fetch it) | `app/auth/*`, `components/auth/*`, `components/theme/CardPage.tsx`, `lib/signIn.ts` |
| Site chrome | The nav as the top of the night sky (gel hover pills, a sage underline on the current page, the slime mark on カイル, a console search field, a fixed-size Log in / avatar slot) and the account menu as a Great Sage console ("《Notice》 Signed in as Kyle Bautista.", ● on the current page's item, Lift Tracker ↗); "Skip to content" as a console chip over the bar's left end on the first Tab (the link strip fades behind it); keyboard focus never hidden under the bar; the footer as a forest floor with the 《Report》 credits | Static, paint-only chrome with a fixed box (§9.22); current-page logic in `lib/routes.ts#isCurrentPath` (tested); every class in `tokens.ts`'s "Site chrome" section; the brand slime is server-rendered and passed to `AnimeBar` as `brandMark`, and both chrome slimes take a fixed `idScope`. `SkipLink`: with JS it focuses the page's `<main>` (a temporary tabindex) without touching the URL; without JS it is a fragment link to the `#main-content` span after the nav. `FocusNudge`: a `focusin` leaf that scrolls by the overlap, keyboard only | `components/common/*`, `components/theme/tokens.ts`, `components/home/NightSky.tsx#Treeline`, `app/layout.tsx` (the skip target) |

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
`/api/anime-list/<id>/user-data` and apply the **response's** `userData`. **+1, catch-up and Undo**
go through `TrackQueue` (`lib/anime/trackQueue.ts`, created in state, connected in an effect):
- Per show: the server-confirmed value, at most one request in flight, and a queue of taps made
  meanwhile, merged into one `{increment: k}` (or `{catchUpTo}`). The card shows the confirmed value
  with every unsent op applied by the server's own rules (`applyProgressRequest`).
- One line per burst, 700 ms after the last action with nothing in flight (at once at the finale).
- Undo restores the server's `previous` from the first response of the streak, sent with `expect` =
  the latest response: a 409 `changed` (another tab or device moved it) adopts the stored value.
  A response whose `previous` isn't what this page last knew (loaded, re-read or saved) breaks the
  streak and says the stale line ("It had changed since this page last checked: now Ep 16 / 26.");
  an Undo waiting on that save goes back to the other writer's value and says so ("Undone, but it
  had changed since this page last checked: …").
- "Caught up" only when a burst ends exactly on the last aired episode. A catch-up's response
  carries the stored airing fields, and the card adopts them, so its chip agrees with the server.
- Requests and their bodies share one 8 s deadline (`api.ts#fetchJson`); unknown-outcome re-reads
  made in the same tick share one list GET.
- Rejected saves (401, 400, 404) roll back to the confirmed value. A save with **no answer** (network,
  timeout, 5xx, busy) is never resent: the engine re-reads `GET /api/anime-list/user/<id>` once.
- The Edit dialog's Save first awaits `whenIdle()` (the card's batch), then sends its absolute write.
- The server (`server/lib/userDataWrite.ts`) reads the entry, applies the request, and writes only if
  the entry's raw stored fields (`id`, `episodes`, every `userData` field) still match:
  `$elemMatch` + positional `following.$.userData`, at most 3 tries, then 409 busy.

For the owner, `MyList` re-reads
`GET /api/anime-list/user/<id>` once on mount. Back/forward replays the router cache's original
payload, and without the re-read a later `+1` would write stale values back. Local edits since mount
win. Visitors see the owner's **first name only** and no photo; page titles and link previews always
use the first name (`publicOwnerName`).

### 5.4 Search `/search?q=frieren&format=tv&page=2`
1. **Params.** `lib/search.ts` normalizes `q` (whitespace collapsed, trimmed, ≤ 100 code points) and
   `page` (1–50); `lib/searchFilters.ts#normalizeFilters` the filters (exact values only: format and
   genre slugs, a 4-digit year from 1940 to `validYearRange(now).max`, My List's `season` and
   `release` values; anything else is dropped and never sent to AniList). Canonical order
   `q, format, genre, year, season, release, page`; `searchKey === searchResultsPath`, one string for
   the URL, both Suspense keys and the arrival token. No query → the home (no AniList call; filter
   params ignored). Query pages are `noindex` (`generateMetadata`), and `app/robots.ts` keeps
   crawlers off `/search`.
2. **One request.** `page.tsx` renders the banner at once (`SearchBanner`: the box on top, the h1
   `#search-results-title`), then two `<Suspense key={searchKey}>` boundaries stream the
   banner's Great Sage report and the results. Both await one `cache()`d
   `runSearch(query, page, filtersQuery, maxYear)` (primitives: React's `cache` compares by identity)
   → `searchAnime()` with `searchVariables()` (a year alone is a start-date range, never `seasonYear`
   alone: AniList gives most music videos and many ONAs no season; the copy says "that began in
   2026" for it and "from Fall 2026" for the season filing) (throws
   `AniListError`; caught → the error panel, 429 → rate-limit copy with AniList's `Retry-After` when
   sent). The query asks `pageInfo { currentPage hasNextPage }` only: on title search AniList's
   `total`/`lastPage` are false ("gundam": 5000 / 166, with 54 results; a page past the end reports
   `(page − 1) × 30`). `searchView()` classifies the response (results, none on page 1, past the end
   on a later page, error); `resultWindow()` gives an exact total only when `hasNextPage` is false:
   `(page − 1) × 30 + shown`. Every line comes from `lib/anime/searchCopy.ts`: totals say "excluding
   adult titles", "none" says "This search skips adult titles.", only page 1 claims the closest
   results, and page 50 says the search stops there. With filters, every count and "none" line
   names them ("No movie results from 1998. …"), the sub lists them, and the none panel adds that a
   season is AniList's filing when a season is set.
3. **Why no `loading.tsx`.** Next 16.3 reuses the page across `?q` / `?page` navigations, so
   `loading.tsx` never shows for them; and it can't read the query, so its server-rendered fallback
   painted the wrong page (the home) first on every full load of a results URL. The keyed boundaries
   do both jobs: a new search or page swaps in the pending line and `CARD_LAYOUT` skeletons at once
   (`SearchPending`), and a full load's first paint is the right banner. The banner stays mounted
   across searches (the sky doesn't restart, and text typed into the box while AniList answers
   survives); the box is keyed by the search without its page (a new title or new filters reset it,
   paging keeps typed text; step 7). Without JavaScript the results never leave their
   hidden streamed div: the visitor gets the banner, a working GET box, "Search results need
   JavaScript on this site." and a link to AniList's own search for the query.
4. **Focus and speech.** `app/search/layout.tsx` holds the page's one sr-only `role="status"`
   (`SearchStatus`, which only shows lines written since it mounted). Every control that starts a
   search leaves a one-shot token (`components/utils/searchArrival.ts`, matched on the canonical key,
   30 s, dropped on popstate): the console submit, the chips, NavSearch, the pager, "Back to page
   1" and Clear filters (`onNavigate`), Top Anime's Track and the landing's Tempest "Find it". The
   search on screen is the key the server rendered (recorded by `holdSearchFocus` / `arriveAtSearch`),
   never re-parsed from the URL; only `rememberSearchFocus` defaults to no filters. The pending state says
   "Searching AniList for “q”…" (with filters: "Searching AniList for “q” (TV, Fall 2026)…");
   `SearchArrival` then speaks the outcome and focuses the h1 (new
   search) or the Results h2 (paging), unless the reader already put focus somewhere. Back/Forward
   and full loads stay silent and empty the status line. Searching again for what is on screen
   (the same URL, so nothing arrives) repeats the outcome and focuses the h1 unless focus is already
   somewhere, such as the box (`repeatSearchArrival`); Next still re-requests that URL, as before.
5. **Title.** `SearchTitle` corrects `document.title` when Next leaves it stale: in 16.3 a bare
   `/search` loaded in full kept its "Search anime" `<title>` through later `/search?q=` client
   navigations (it did before the redesign too, and a prefetch of bare `/search` did the same, so the
   consoles never prefetch). It runs in the navigation's commit, before the route announcer reads
   the title.
6. **Overflow.** The layout's `<main>` is `min-w-0 [contain:inline-size] overflow-x-clip`, and the
   box's input is `w-full size={1}`: an `<input>`'s default width (size=20) used to widen the body's
   single grid column past 320–390px (§9.13), which stretched the nav with it.
7. **The filter panel** (`app/search/FilteredSearchConsole.tsx`, the results box only): closed by
   default; with filters applied it is always shown from 1024px (My List's pattern). Selects never
   auto-submit: Analyze or Apply filters builds the canonical URL (`hrefFor`, `router.push`), and a
   new title searched from the box keeps the filters. The fieldset is keyed by the whole search
   (paging resets unapplied changes) while the box is keyed without the page (typed text survives
   paging). Without JavaScript the toggle hides, the panel shows, and the native GET carries empty
   params (dropped by normalization). The filter tables live in `lib/searchFilters.ts` and the
   landing's strings in `lib/anime/searchConsoleCopy.ts`, so the nav search and the landing (which
   import `lib/search.ts` and the console) never ship them: Turbopack keeps whole modules.
Try again is a full document request (never a cached failure); results, chips and the pager never
prefetch (§9.5).

### 5.5 Server-side air-date refresh (`server/lib/userList.ts#refreshEntriesIfStale`)
On every list read (both list pages and `GET /api/anime-list/user/<id>`):
1. **Filter.** Only entries whose status isn't `FINISHED`/`CANCELLED` are candidates: airing shows
   first, at most 150 per refresh. Skip if `listRefreshedAt` is < 10 minutes old. Skipped for
   link-preview bots (`lib/previewBots.ts#isPreviewBot`): the list pages pass `{ refresh: false }`.
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
that rebuilds the adapter after a failed Mongo connection (`server/auth/index.ts`). The callback path
is `lib/signIn.ts#safeCallbackPath` (same-origin only, never `/auth/signin`, no `//` or `/\` paths).

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

### 5.8 List share images (`/user/og/<id>/<v>`, `/mylist/og/<id>/<v>`)
1. **Tags.** The page's `generateMetadata` builds the card (`components/og/shareCard.ts`:
   `listShareCard` / `scheduleShareCard`) from `readEntriesCached(lookup.user)` (stored entries,
   normalized once per request and shared with the page; no refresh) and emits
   `og:image = /<route>/og/<id>/<shareVersion(card)>` with width, height, type and alt, plus
   `og:type`, `og:site_name`, `og:url`. Next derives `twitter:card summary_large_image` and mirrors
   the image and alt. Every viewer and user agent gets the same tags.
2. **Image.** The route checks `CANONICAL_ID_RE` and `SHARE_VERSION_RE`, runs `readListCard` (one
   projected `findOne`: name, and per entry id, status, userData, upComingAirDate; no session, no
   refresh) and draws the card with next/og (Satori) at 1200×630, ≤ 300 KB, under a 5 s deadline:
   a render that fails or stalls (a render-time font fetch) is redone with the neutral wording
   (`components/og/respond.ts`). 404s are returned (not thrown), so ISR keeps them for the hour.
3. **Caching.** Runtime ISR (`force-static`, `revalidate = 3600`, `generateStaticParams → []`):
   nothing renders at build, each URL renders once, then at most hourly; 404s are cached too.
   `v` is only a cache key (in the path, since ISR ignores the query): the image always draws the
   current stored data, so a mismatch is at most an hour newer than its `v`. Cache-Control stays
   ImageResponse's default; unfurlers keep their own copies (X 7 days).
4. **Names.** First name only (`publicOwnerName`), invisible format characters stripped,
   NFKC-normalized ("fancy text" back to letters), emoji dropped, at most 24 graphemes
   (`drawableName`), and the h1 fitted with a measured Geist advance table (`fitTitle`:
   84 / 68 / 56 px, then the name is clipped with "…" so "'s list" never is). Scripts Satori can't
   shape get neutral wording; the alt text keeps the real name.
5. **Bots.** A preview bot's view of a list page reads stored data only (`isPreviewBot`), so an
   unfurl spends no AniList budget. robots.txt's preview-bot group lets X, Facebook/Messenger,
   Discord, LinkedIn, Telegram and WhatsApp read list pages and their images; search crawlers stay
   disallowed (not noindex). Slack ignores robots.txt either way.

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
// sends is unchanged. A +1 batch or catch-up is applied server-side to the STORED value through
// normalizeUserData (lib/anime/userDataRequest.ts) and written with a field-by-field
// compare-and-set (server/lib/userDataWrite.ts, at most 3 tries).
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
| ISR | season pages 300 s, `/topanime` 3600 s, `/` 600 s, `/user/og/*` and `/mylist/og/*` 3600 s (404s cached too) | Season/Top Anime: upstream failure **throws** → last good page kept. `/` throws only for the season request (the build renders fallbacks) |
| React cache | `lookupListOwner`, `readEntriesCached` | Per request, shared by `generateMetadata` and the page |
| Next data cache | `landing-extras` (Tensura, Rimuru, season id pages), 3600 s · `next build`'s implicit copy of `/topanime`'s page 1 (the segment's 3600 s) | `revalidateTag("landing-extras", "max")` refreshes it (Next 16 requires the profile argument); only 200s are cached. A build within an hour of the last reuses page 1, so its banner time comes from MAL's Date header |
| CDN | `/api/top-anime?page=N`: `s-maxage=3600, stale-while-revalidate=300` | The only cache for "Show more" pages (errors are `no-store`) |
| Proxy | `proxy.ts` | Season redirects at request time (never in `next.config.js` `redirects()`, which are build-time) |
| SWR | `[/api/anime-list/ids, userId]` (list membership, all cards; per user so an account switch in another tab never shows the old ids) · `/mylist/<id>` (Airing Schedule, poll 60 s) | No root `SWRConfig` |
| React context | `HeaderContext` (season sort mode + continuing toggle), under `app/anime/layout.tsx` | |
| Local state | My List (`MyList.tsx`: items, `activities`, `held`, and one `TrackQueue` in state), Top Anime list, season `PageBase` (pins, cursor, refresh state), the details sheet (`useAnimeDetails`) | |
| Module memory | `app/topanime/rankingStore.ts` · `components/animev3/utils/seasonFreshness.ts` · `components/animev3/season/seasonFocus.ts` · `components/utils/searchArrival.ts` · `components/theme/RetryButton.tsx` | Top Anime's loaded pages for the tab, keyed by page 1's ids; restored on the next client visit (Back from Track) · a season's browser refresh, so Back/Forward doesn't refresh again · a one-shot focus token for season navigation (10 s) · /search's one-shot arrival token (30 s, matched on the canonical key `searchKey`: query, filters and page; dropped on popstate) and its status line's text · the error pages' focus-return token after a failed retry (`retryFocusAt`, 10 s) |
| Shared clocks | `useNow()` (1 s, countdown leaves only) · `useMinuteNow()` (per minute: "today", season phase) | `useSyncExternalStore`; one interval each for the page. `useMinuteNow` reads null again once nothing subscribes, so a later mount renders its fallback first |
| Mongo | `listRefreshedAt` | Refresh lock/throttle |
| sessionStorage | `kv:add-intent` | Landing sign-in intent `{id, status?, at, media}`; auto-add only within 15 min, consumed once |
| localStorage | `kv:quests:<userId>` (Quest 2/3 flags), `kv:live-timers` (pause live timers) | Per device; read via `useSyncExternalStore`, every access in try/catch |
| URL query | `/user/<id>?shelf=&sort=&q=&year=&season=&day=&release=`, `/mylist/<id>?day=`, `/search?q=&format=&genre=&year=&season=&release=&page=` | The list/schedule view (defaults omitted; `replaceState` only, no history entry per keystroke); /search's canonical URL (a no-JS filter submit may carry empty params, which are dropped) |

---

## 8. Directory map

```
proxy.ts                    request-time /anime season redirects
lib/                        pure, shared by server + client (unit-tested)
  season.ts                   season math: current season, valid years, route validation, shiftSeason, landingSeason
  landing.ts                  landing constants/types + pure helpers (airing candidates, extras parsing, Tempest,
                              tiers, schedule grouping, add-intent parse/serialize)
  routes.ts                   myListPath, airingSchedulePath, searchPath, signInPath, isCurrentPath (nav + menu current page),
                              listShareImagePath, scheduleShareImagePath
  previewBots.ts              ROBOTS_PREVIEW_BOTS (robots.ts's second group), isPreviewBot (no AniList refresh for unfurls)
  topAnime.ts                 /topanime's data: TopAnimeItem/Page, MAL ranking → slim page (toTopAnimePage: ends at the first
                              unranked entry, drops Rx, WebP covers), dedupeByMalId, parseTopAnimePage (?page bound),
                              readTopAnimePage (the browser re-reading /api/top-anime)
  search.ts                   /search's rules: normalizeQuery/Page, searchResultsPath / searchKey (+ filters), resultWindow
                              (exact totals only on the last page), searchView, the h1/h2 ids, SearchFilters, NO_FILTERS,
                              filtersQuery (no tables: the nav and the landing import this)
  searchFilters.ts            /search's filter tables (SEARCH_FORMATS, SEARCH_GENRES), normalizeFilters, readFilterParams,
                              parseFiltersQuery, searchYearOptions, searchVariables (AniList's variables)
  signIn.ts                   /auth/signin's rules and lines: signInMessage (?error= → {kind, text}; a Map, unknown → the
                              default), safeCallbackPath (same-origin, never /auth/signin, no // or /\ paths), SIGNED_IN_LINE,
                              SIGN_IN_NOSCRIPT
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
  anime/trackerConsole.ts     the Great Sage tracker lines (+1 and burst ranges, stale, nothing logged, undo, failures, status,
                              score, edit diff; the catch-up chip's and Undo's labels), shared by TrackerDemo and My List
  anime/userDataRequest.ts    the user-data PATCH's four bodies: parseUserDataRequest, applyProgressRequest (increment /
                              catch-up on the stored value), applyUserDataRequest (Undo's expect), isUserAnimeData, sameUserData
  anime/trackQueue.ts         the +1 engine (TrackQueue, SaveError): queue, bursts, Undo streaks, re-read on unknown outcomes;
                              shared by My List and TrackerDemo (no React, no DOM; transport, clock and timers injected)
  anime/searchCopy.ts         every /search line and its condition, filters included (truth-swept); the filter panel's
                              labels and options; re-exports anime/searchConsoleCopy.ts
  anime/searchConsoleCopy.ts  SEARCH_EYEBROW, the examples and the console strings shared with the landing's search chapter
  anime/releaseStatus.ts      RELEASE_STATUSES + labels + isReleaseStatus (My List's and /search's release filter)
  anime/listCopy.ts           My List's and the Airing Schedule's visitor lines, stats and labels (listStats,
                              listVisitorLine…), publicOwnerName: shared by the pages and their share images
server/                     server-only
  auth/index.ts               authOptions (Google + optional GitHub/Twitter, lazy MongoDBAdapter, session.objectId)
  lib/mongodb.ts              the only MongoClient (cached on globalThis, retries, failed connects not cached)
  lib/anilist.ts              anilistQuery (throws AniListError with status + retryAfterSeconds, 429 retry), fetchMediaByIds,
                              searchAnime (→ {media, hasNextPage, page}; no total, §5.4)
  lib/myanimelist.ts          fetchTopAnimePage → {page, fetchedAt (MAL's Date)} (MAL API v2 ranking with X-MAL-CLIENT-ID; one
                              deadline for headers + body; retries 429/5xx/network, then throws MyAnimeListError and pauses
                              the instance: MAL's Retry-After after a 429, 15 s otherwise)
  lib/userList.ts             resolveListOwner, readEntries, readEntriesCached, loadListEntries ({ refresh }),
                              refreshEntriesIfStale, getListIds, readListCard (+ CARD_PROJECTION, CANONICAL_ID_RE)
  lib/userDataWrite.ts        writeUserData: read → apply → compare-and-set on the raw stored entry (pin, casFilter), 3 tries
  lib/listRoute.ts            lookupListOwner (React cache) + requireListOwner (layout guard)
  lib/landing.ts              loadLandingData (≤ 2 AniList requests; throws only at runtime when the season fails), fetchLandingExtras
app/
  layout.tsx, providers.tsx   metadata, NavBar + SiteFooter; SessionProvider > {children, Toaster (themed), Analytics}
  error.tsx, global-error.tsx, not-found.tsx
  (home)/  anime/  search/  topanime/  auth/  user/  mylist/   see §3
  api/anime-list/, api/top-anime/, api/auth/   route handlers (see §3)
components/
  animev3/                    season browser: PageBase (the page's client root), layoutSelector/HeaderProvider (sort +
                              continuing context), utils/ (getAniListData, useLazyLoad, seasonFreshness)
    season/                     SeasonBanner (minute-clock leaf) → SeasonHeader (PageBanner + SeasonNav, also error.tsx),
                                SeasonNav + SeasonLink (intent prefetch, focus token), SeasonControls (+ SortHint),
                                SeasonGridNotices (OrderDivider, LoadMoreError, SeasonEndCard), SeasonEmpty, useSeasonPhase
  mylist/                     Airing Schedule UI (week panel, NextEpisodes card) + schedule.ts (grouping)
  common/                     the site chrome: NavBar (server: box, stars, hairline, link strip), AnimeBar (NavLink + the
                              brand), NavSearch, LogInBox (session slot + account menu), SiteFooter (server: the forest floor),
                              SkipLink ("Skip to content", the nav's first child), FocusNudge (keeps keyboard focus out from
                              under the sticky nav; renders nothing)
  animev3/ListToggle.tsx      the shared add/remove toggle (every card); ListToggleAction = AnimeCard's full-width version
  theme/                      the Tempest design kit for every page (guide: .claude/skills/tempest-theme):
    tokens.ts                   class tokens (focus rings, containers, ANIME_GRID / INFO_GRID + cover sizes, the classic card's INFO_*,
                                type, panels, cards, buttons, fields, shelves, the site chrome's NAV_* / MENU_* / FOOTER_*)
    cardLayout.ts               ANIME_CARD_LAYOUT ("classic" | "poster"): the one switch for the season page, /search and
                                the landing's Magic Sense (CARD_LAYOUT bundles card, skeleton, action, grid, sizes, spans)
    AnimeInfoCard, AnimeInfoCardSkeleton  the classic card (owner's layout, gel surface, Magic Sense HUD, readout, synopsis well,
                                perched slime, MAL/AniList/Crunchyroll glyphs); fixed-height regions, so the skeleton matches
    AnimeCard, AnimeCardSkeleton  the poster card (switchable; the Quest Log's `compact` always); `Action` injects the page's
                                add control; AnimeGridCardProps is shared by both cards
    AnimeDetailsDialog          useAnimeDetails(): one 《Analyze》 sheet per page (native modal <dialog>, own status line)
    LinkPendingGlyph            a link's arrow that becomes a spinner while its navigation is pending (useLinkStatus)
    dialog.ts                   isBackdropEvent (EditEntryDialog, the details sheet)
    PageBanner                  night-sky app-page header (eyebrow, lead, SageLine or a streamed sageSlot, h1, actions, aside;
                                asideClassName)
    CardPage, RetryButton       the card pages' frame (404, error, sign-in, account: a night-sky <main data-card-page> with a
                                sky slot, a glow, a ConsoleFrame card, the owner's <section>) and "Try again" with the
                                focus-return token (error.tsx, global-error)
    ErrorDecor                  app/error.tsx's lazy sky + worried slime (its own chunk: error.tsx ships on every page)
    SearchConsole, SearchChips  the Great Sage search console (GET /search via next/form, never prefetched, leaves the
                                arrival token) + "Try:" chips: /search and the landing's chapter; `toggle`/`children`/
                                `hrefFor` slots, filled only by /search's results box (app/search/FilteredSearchConsole.tsx)
    FilterSelect                My List's labelled select (controlled, or a GET form's field), CountBadge, FilterIcon: My List
                                and /search's filter panel
    ConsoleFrame, SageDoorway   the console frame (scanlines, corner brackets) and a 《Kind》 doorway row: the same two places
    StatGrid, icons             the stat dl (My List, Top Anime); TrophyIcon, CrownIcon, StarIcon
    EvolutionCard, SagePanel    the evolving slime card; themed empty/error states
    ShareLink, LiveTimersToggle share strip (owner, or a signed-out placeholder) + useCopyListLink; the timers pause button
    NextEpisodeLine             a tracker card's countdown / release-status line (ListCard and TrackerDemo)
    NewEpisodesChip             "2 new": aired episodes not logged (lib/anime/airing.ts#unloggedAired); with onCatchUp (the
                                owner's card, the demo) the "Log N new" button
    UndoButton                  a tracker card's timed "↶ Undo +N" (10 s drain, paused on hover / its own focus / a hidden tab)
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
                                the chapters; Slime + slimeArt (original mascot SVG), SageLine (《Notice》 lines);
                                NightSky also exports MagicCircle and Treeline (the footer's static forest); `forest={false}`
                                drops the forest band and runs the sky down to the horizon's navy (the card pages);
                                skyArt.ts: the forest's and the magic circle's pure geometry (MAGIC_CIRCLE_*), shared with
                                the share images (treelineSvgMarkup, magicCircleSvgMarkup); slimeArt's `tier` option
    analytics.ts                typed Vercel Analytics events (trackLanding, trackOnce)
  auth/                       sign-in (signIn/SignInActions: the client island; signIn/SignInSlime: the CSS-switched slime),
                              GoogleButton (Google's light pill; also the landing's sign-in dialog), GoogleIcon (the kit's G,
                              a client leaf importing ./google-g.png), SignOutButton
  utils/                      anilist-queries/ (mediaFields fragment + queries, landingExtrasQuery), fetchWithTimeout,
                              useMyList, useNow (1 s), useMinuteNow (per minute: "today" labels), searchArrival (/search's
                              focus token + status store)
components/og/              the list share images (next/og): fonts (assets/og), OgSky (sky, stars, aurora, treeline), parts,
                            respond (5 s render deadline, neutral-wording fallback, returned 404s),
                            ListShareImage, ScheduleShareImage, shareCard (the view models + shareVersion, fitTitle, drawableName)
assets/og/                  Geist, Geist Mono and a 《》 Noto Sans JP subset (TTF) + OFL.txt: the share images' fonts
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
4. **Entries are keyed by AniList `id`.** MyAnimeList (`/topanime`) only has MAL ids, so never send those
   to `/api/anime-list`. Use the "Track" → search flow instead.
5. **The AniList budget is shared** (~30/min per server IP). Don't prefetch links to search results
   (or to `/search` from its own forms: §5.4.5); links to bare `/search` (the footer, the 404 page)
   use `prefetch={false}`.
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
    instead of truncating. Keep metadata columns shrinkable. The nav can't widen the column
    (`[container-type:inline-size]`); its links need 312px at 320 (no brand slime), 338 at 360–639
    and 620 at 640 (no brand slime at 640–819) in the widest fonts (`tokens.ts` "Site chrome" has the
    arithmetic). The 640 row must fit 625, not 640: desktop browsers with a classic 15px scrollbar
    still match `sm:` at 640–654px. When the links can't fit (large default fonts, zoom, a 280px
    screen) the link strip scrolls sideways. Re-measure before adding to the bar.
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
    `/auth/signin` is the same: a static shell whose only Suspense boundary is the action slot
    (`useSearchParams`). It has no `loading.tsx`: one shipped "Loading…" as the static HTML and hid
    the card in `<div hidden>`. `app/auth` has none either: it would also wrap `/auth`'s redirect
    (§9.6). Check: `.next/server/app/auth/signin.html` has one `<h1>`, no `<div hidden id="S:` and
    no `<!--$?-->`.
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
    keeps the compact poster card on purpose: a 4-up picker, not a demo), SageSearch ↔ the `/search`
    home (the same `ConsoleFrame`, `SearchConsole`, `SearchChips`, `SageDoorway` and `SEARCH_*`
    strings; the results box's filter panel is `app/search/FilteredSearchConsole.tsx`, which fills
    `SearchConsole`'s `toggle`/`children`/`hrefFor` slots: the home and SageSearch pass none, so they
    stay identical), and SageSearch's Top Anime doorway ↔ `/topanime`'s banner sub (the same promise:
    highest-ranked shows, each with a Track shortcut). Change both sides together. In-page jump links use next/link or a button, never a
    plain `<a href="#…">`: a native fragment entry has no router state, so a later Back changes the
    URL but not the page.
19. **Season counts and "none" claims carry the lineup's scope.** The season query leaves out ONAs,
    TV shorts and adult titles, so a total says so in the same sentence ("All 72 Fall 2026 shows
    sensed, excluding ONAs, TV shorts and adult titles.") and an empty state is about the page ("No
    shows here yet. This page skips …"), never "AniList lists no …". Counts that may be partial say
    "50+" / "at least 50". `lib/anime/seasonCopy.ts` holds them all, with a truth-sweep test.
    `/search` follows the same rule: the search covers every format but never adult titles, so an
    exact total says "excluding adult titles" and "none" says "This search skips adult titles."
    (`lib/anime/searchCopy.ts`). Filtered totals and none lines also name every filter ("No movie
    results from 1998. This search skips adult titles."); a season is AniList's filing (the none
    panel says so), a year alone the start year. Never "all of AniList".
20. **A modal makes the page's status line inert.** `showModal()` puts everything outside the
    `<dialog>` behind the backdrop, toasts included, so a dialog that changes something speaks its
    own result (the details sheet has its own sr-only `role="status"`; `ListToggle`'s `onResult`).
21. **Class strings a server component renders come from a non-client module** (`tokens.ts`). A
    string imported from a `"use client"` file is a client reference on the server, so its classes
    break (the server-rendered `/search` pending skeleton uses the classic card's tokens).
22. **The site chrome's box is load-bearing, and the nav is paint-only.** The nav is `h-16` + `mb-2`,
    `sticky top-0 z-40`: PageBanner, Hero, CardPage and both list skeletons use `-mt-2`, Hero's
    `calc(100svh-4rem)`, every `scroll-mt-20` and AboutRanking's `lg:top-20` assume it, so change them
    together. It sits over every scroll frame: static gradients, stars and shadows only, no infinite
    animation, `filter`, `backdrop-filter` or scroll listeners; its only motion is hover/focus color,
    the phone search's 200 ms width, the menu's one-shot fade + Notice typing, and Pepe while
    hovered/focused. The phone search's open width is `calc(100cqw-3.5rem)` against the nav (a
    size container), so a classic scrollbar can't push it off-screen; closed, the input has no
    padding (border-box can't shrink below padding + border) and `indent-12` hides its text (forced
    colors repaints `text-transparent`). The link strip scrolls, so its controls use `FOCUS_RING_NAV`
    (`-outline-offset-2`: forced colors paints the outline, and an outer one would be clipped) and a
    focused link scrolls only the strip into view. `<footer>` must stay a direct child of `<body>`
    (StickyCta observes `body > footer`), and its classes come from `tokens.ts` (§9.21). A `Slime`
    a root-layout server component renders needs a fixed `idScope`: server `useId` values restart at
    `_S_1_` in every RSC render, so the first slime of a segment reached by client navigation would
    otherwise paint from the layout's (possibly hidden) gradient defs. CardPage's `-mb-8` cancels the
    footer's `mt-8` (the card pages' sky runs to the footer's horizon): change `FOOTER` and `CARD_PAGE`
    together. On those pages (`main[data-card-page]`) `FOOTER_HORIZON` turns flat navy through a
    `body:has()` variant, so the forest-less sky meets the treeline with no dark band; below 640px the
    card's drop shadow is shortened (`CARD_PAGE_FRAME`) so the 24px bottom padding doesn't cut it flat.
    "Skip to content" (`SkipLink`) is the nav's first child, absolute (`sr-only` until focused), so it
    takes no room in the bar; it is the strip's `peer` (the strip fades while it shows). Its target
    is the `#main-content` span `app/layout.tsx` renders after the nav: absolute, so it is not a row of
    the body grid. With JavaScript a plain activation never navigates (no history entry, §9.18): it
    focuses the page's `<main>` with a temporary `tabindex="-1"` (removed on its blur or the next
    pointer press: a permanent one would make Next focus it after every navigation, §9.15). Keep
    exactly one `<main>` per page, in a layout that persists across the loading skeleton where the
    route has one (`/user`, `/mylist`), so a skip during loading still lands on it.
    Focus under the sticky nav (WCAG 2.4.11) is fixed by `FocusNudge` (keyboard `focusin` only:
    not after a pointer, not on a window regaining focus, never inside the nav, a dialog or a fixed
    element), never by `html { scroll-padding-top }`, which makes the page jump ≈ 460px
    when a nav link gets focus while scrolled. The landing's fixed StickyCta is kept off focused
    content by `scroll-padding-bottom` (globals.css: 5rem below 1024px, 6rem for the pill above).
23. **+1 writes are relative.** A tap sends `{increment}` (or the chip `{catchUpTo}`) through
    `TrackQueue`, never an absolute progress, and the server applies it to the stored value. Only the
    Edit dialog sends absolute userData (after `whenIdle()`), and only Undo sends `expect`. Cards on My
    List never move while you tap: holds release only on a shelf, sort or filter change, an Edit save
    or a removal. Keep the response's `previous` (Undo and the stale line need it).

24. **Share images (`components/og/`).** Satori's dialect: every div with more than one child is
    `display:flex`; a text div that wraps or clamps is `display:block` with one string child;
    components return one element (call `ogStars()`/`ogAurora()`/`ogTreeline()` as functions);
    `WebkitTextStroke` colors are hex; DOM order is paint order; glows are gradients; images are
    data-URI SVGs; no hooks, clock or randomness. Never read the session or call
    `refreshEntriesIfStale` there. The images mirror the banners (copy from `lib/anime/listCopy.ts`):
    change them together and bump `SHARE_FORMAT` when the design changes (every URL changes).
    Each PNG stays ≤ 300,000 bytes (WhatsApp drops larger og:images). Fonts are read with literal
    `join(process.cwd(), "assets/og/<file>")` paths, also listed in `outputFileTracingIncludes`;
    regenerate `GEIST_ADVANCE` if the Geist file changes. Magic-circle numbers live only in
    `skyArt.ts`; the slime's tier styles are written in `Slime.tsx` and `slimeArt.ts`: keep them in
    sync. No raw bidi control characters in source (write them as `\u` escapes).

---

## 10. Known limitations / next steps

- Lists are public to anyone with the link; there's no private-list setting.
- Landing: a build while AniList is down ships a fallback `/` (no countdowns) until the first
  successful regeneration (≤ 10 min after traffic). The Tensura data (`TEMPEST_IDS`, short labels, `TEMPEST_FALLBACK`) is static and
  needs a code change for new franchise entries.
- A stale ISR season page is corrected in the browser about a second after load (§5.1). Visitors
  without JavaScript still get the cached copy until Next's background rebuild lands.
- `SessionProvider` has no server session, so on full page loads the nav shows a static
  placeholder ring for a moment (the same 48/63px box as Log in and the avatar, so nothing shifts)
  and card toggles a loading pill. Without JavaScript the placeholder stays.
- Without JavaScript, pages whose `<main>` has no links without JS (`/user`, `/mylist`,
  `/auth/signin`) send the Tab after the skip link to the footer.
- `FocusNudge` scrolls after the browser's own focus scroll (next frame, before paint): a keyboard
  user may see one instant correction on a slow device. It only knows the nav and the landing's
  StickyCta (via `scroll-padding-bottom`); a new fixed or sticky overlay needs the same care.
- Root `error.tsx` and `global-error.tsx` render only in the browser (a render error above every
  Suspense boundary ships Next's empty `__next_error__` shell), so visitors without JavaScript get a
  blank page. A root layout that throws during server rendering shows Next's built-in, unthemed 500
  page. A successful Try again on the fatal error page is silent and drops focus to `<body>` (as
  before the redesign): Next's route announcer remounts with the root layout and never announces its
  first title.
- The nav's fallback avatar is `/rimuru.png`; `/auth` shows the owner's initial (two different
  no-photo looks). The photo stacks over the initial with no JavaScript, so a photo with
  transparency shows the gel disc through it, and a broken photo shows the initial with Chromium's
  small broken-image glyph in the disc's top-left corner (a client `onError`/`onLoad` leaf would fix
  both).
- A 404 from a list layout (`notFound()` for an unknown `/user` or `/mylist` id) also renders in the
  browser only: without JavaScript the page is blank (Next's empty shell).
- Share images: unfurlers cache by URL (X 7 days, LinkedIn ≈7 days, Facebook until a re-scrape,
  Telegram until @WebpageBot), so an old post keeps its old image. Its counts ("N still airing",
  "N shows with an upcoming episode") are true as of the last list read, not "now", which is why
  the images carry no date, countdown or air time (don't add an "as of" stamp).
  More exactly, they are true as of the snapshot's last AniList refresh: a person's view of the list
  or a read of the list API starts one (at most every 10 minutes); preview bots' views and the image
  route never do, so a list only bots have fetched lately is drawn from an older snapshot. The image can be up
  to an hour newer than its `v`. Random well-formed `v`s each create an ISR entry (a Mongo read, a
  render, a billed ISR write): watch Vercel's usage for bursts of distinct `/user/og/…` paths (the
  remedy is a Firewall rate limit). Names in kana, kanji or Hangul make Satori fetch Noto at render
  time (a failed fetch draws boxes for up to an hour; a stalled one falls back to the neutral
  wording); emoji are left out of drawn names; Latin, Cyrillic, Greek and Vietnamese names are
  bundled. Arabic, Hebrew, Indic and Thai names are drawn as
  "Anime list" / "this list". The Sage line wraps word by word (Satori can't wrap mixed-color
  text). Preview deploys' og:image URLs point at production (`metadataBase`): test the routes by path.
- The preview-bot robots group was added from the platforms' docs, not measured: after deploy, check
  Meta's Sharing Debugger, X, LinkedIn Post Inspector, @WebpageBot and Discord, and Vercel's logs by
  user agent (bots' page views must not be followed by AniList traffic). Bluesky and Mastodon aren't
  in it (`isPreviewBot` already spares them the refresh).
- The Google button names Google Sans first but doesn't download it (system Roboto/Arial
  otherwise); loading it with `next/font` would add a build-time Google Fonts fetch.
- NextAuth's `pages.error` is unset: Configuration and Verification errors land on NextAuth's own
  unthemed `/api/auth/error`. Without JavaScript, Sign out goes to NextAuth's unthemed confirmation
  page.
- `/auth/signin` is static, so its `?error=` box appears after hydration (the button moves down
  once; the card is top-anchored, so the header stays). If `signIn()` fails (network), the button
  just resets; there's no message yet.
- The landing's no-JS "Start my list" links (`SessionCta`, `QuestLog`) lead to `/auth/signin`.
  Without JavaScript that page can only say "Signing in needs JavaScript on this site." (Before the
  redesign they led to a page stuck on "Loading…".)
- The card pages' sky meets the footer's flat-navy horizon through `body:has()`; browsers without
  `:has()` (and the sign-in slime's switch) keep the generic horizon's dark dip and the idle slime.
- Browsers without container query units (iOS 15) keep the phone search a 44px field while it is
  focused (still usable).
- Treelines are drawn on wide viewBoxes (banners and the finale 7360, the footer 7000, the hero
  3000), so their tallest pines stay pointed up to ≈ 4400px wide (the finale ≈ 6600px, the footer
  ≈ 4200px, the hero ≈ 3900px); past that they are cut flat.
- Catch-up counts aired episodes from the stored AniList snapshot (server and chip alike), so an
  episode AniList postpones still counts as aired until the snapshot's next refresh (a list read at
  least 10 minutes after the previous one, later while AniList throttles).
- A burst line that settles while the Edit dialog is open goes to the page's status line, which the
  modal makes inert (§9.20); the toast still shows it.
- A held card that a +1 completed stays under its old heading (with its Completed badge; the heading
  and the filter readout count the cards shown there, the shelf chips where the shows really are)
  until the shelf, sort or filters change.
- The re-read after a save with no answer uses the list GET, which can trigger the throttled AniList
  refresh (§5.5).
- On a legacy list with duplicate ids, a write can land on the hidden duplicate if the visible one
  changed between the read and the write while the hidden one still matched.
- Taps still queued when the page is left are saved silently (no line, toast or refresh).
- No per-user rate limiting on the write APIs. Lists are capped at 2,000 shows.
- GitHub auto-disabled the cache-warm and health-check crons; re-enable them or use Vercel Cron and
  an uptime monitor.
- `next build` fails if AniList or MyAnimeList stays down past the prerender retries, or if
  `MAL_CLIENT_ID` is missing. This is deliberate: pages throw rather than cache an empty page.
  Redeploy once the API is back.
- `useMyList`'s add/remove toasts render dimmed behind an open details sheet and aren't spoken
  (the sheet says "Couldn't add it to your list. Try again." itself; a specific reason such as
  "list is full" is only in that toast). A top-layer or visual-only toaster would fix it site-wide.
- The landing's Next-episodes card picks from the season's 30 most popular shows, so it can differ
  from the season banner's (which uses every show).
- Season tiles prefetch only on intent, so a first tap on a phone waits for the fetch (the pending
  spinner covers it). Links to `/anime` elsewhere (nav, "Browse this season") rely on Next's
  default prefetch, which serves the redirected season (≈0.1 s on `next start`); there's no
  loading UI if a click beats it.
- `/search` results need JavaScript: they stream into a hidden div only JavaScript reveals. No-JS
  visitors get the banner, a working search box and a link to AniList's own search (§5.4).
- Search filters appear only after a first search (no filters on the /search home or the landing),
  and NavSearch on a filtered page starts an unfiltered search. The genre list is hard-coded (a new
  AniList genre needs a code change). A season filter rarely finds music videos (AniList gives most
  of them no season; the none panel says so), and "Music music video" reads oddly (true, though).
  A year alone is the start date, so a December premiere AniList files under the next winter counts
  in its start year ("that began in 2025"), unlike My List's Year filter (the filing year first).
- On a filtered last page (page > 1) the report is longer than "Fetching page N from AniList…" (as
  unfiltered), so on phones it can wrap to an extra line when it lands.
- Search totals are known only on the last page, and AniList's fuzzy order can shift between page
  requests, so a show can repeat or be skipped across pages.
- `SearchTitle` works around a Next 16.3 head bug on `/search` (§5.4.5); drop it once Next updates
  the `<title>` of `/search?q=` navigations by itself (test: load `/search`, search, read
  `document.title`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
