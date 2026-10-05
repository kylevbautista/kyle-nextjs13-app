---
name: tempest-theme
description: The kylevb design system ("Tempest" theme, from the landing page). Load it BEFORE redesigning, restyling, theming or building the UI of any page or component in this repo — "redesign /search", "make X look like the homepage", "make it fun / immersive", a new page, a new empty or error state. It covers the look, the copy voice, the shared components in components/theme, a page template, and the screenshot check.
---

# Tempest theme: the kylevb design system

The landing page (`/`) set the look the owner wants everywhere: a fan theme built on
*That Time I Got Reincarnated as a Slime* (Tensura). It has a night sky over the Jura forest,
the **Great Sage** speaking in system messages (`《Notice》 …`), and an original slime mascot
that **evolves as your list grows**. It is playful in its framing and exact in its content.

My List (`/user/<id>`), the Airing Schedule (`/mylist/<id>`), Top Anime (`/topanime`), the
season browser (`/anime/<year>/<season>`), Search (`/search`), the site chrome (nav, account
menu, footer) and the card pages (404, error, fatal error, sign-in, account) were redesigned with
this kit.
Read one of them before starting a new page: `app/user/_client/MyList.tsx` and
`components/mylist/AiringSchedule.tsx` for dynamic, signed-in pages; `app/topanime/` for a static
ISR page (server-rendered banner and asides, one client island, pure `ranking.ts` helpers with
tests); `components/animev3/PageBase.tsx` + `components/animev3/season/` for a static ISR page
whose client root renders everything, with every line in a tested copy module
(`lib/anime/seasonCopy.ts`); `app/search/` for a dynamic server page that streams its data into a
stable banner (keyed Suspense boundaries instead of `loading.tsx`, one status line in its layout,
`lib/anime/searchCopy.ts`); `components/theme/CardPage.tsx` + `app/not-found.tsx` / `app/auth/signin/`
for a one-card page (a static sign-in with one client island, its slime switched by CSS `:has()`).

## The rules

1. **Demos and real pages match.** The landing demos real features: `TrackerDemo` shows My
   List's card, `ScheduleDemo` shows the Airing Schedule's week panel, `HeroNextUp` shows the
   Next-episodes card, and the Magic Sense chapter's cards *are* the season page's card
   (`CARD_LAYOUT`: the same card, the same details sheet, the same eyebrow and Sage line
   constants). `SageSearch` is the /search home: the same `ConsoleFrame`, `SearchConsole`,
   `SearchChips` and `SageDoorway`. The Quest Log keeps the compact poster card on purpose (a picker, not a demo). The list share images (`components/og/`) are the My List and Airing Schedule banners at 1200×630, drawn from the same copy (`lib/anime/listCopy.ts`): change them with the banners. A page that has a demo uses the demo's markup and classes. If you change
   one side, change the other in the same PR. The owner noticed when they drifted apart.
2. **Real data only.** Stats, counts, tiers and messages come from actual list or AniList data.
   Never show placeholder numbers or invented "activity".
3. **The theme is a costume.** Every label still says plainly what it is. "Stomach contents:
   17 shows. 9 still airing." works because it is true and readable. A pun must never replace
   the information.
4. **CLAUDE.md still rules.** Use `useNow()` for anything time-based (null until hydrated).
   Show times in Pacific. No `Date.now()` in render: server components use
   `new Date().getTime()`, like `app/topanime/page.tsx`. Sanitize descriptions, put `min-w-0`
   and `[contain:inline-size]` on wide content, and keep redirects before streaming.
5. **Motion always plays.** It ignores `prefers-reduced-motion`; the owner chose this. No
   `motion-safe:` or `motion-reduce:`. Do keep offscreen pausing (NightSky and Slime do it for
   you), and add `<LiveTimersToggle />` to any page with per-second countdowns.
6. **Accessible by default.** Touch targets `h-11` on phones (`md:h-9`/`md:h-10` on desktop).
   Use the focus-ring tokens. Decor gets `aria-hidden`. `SageLine` and `SageTag` already read
   as "Great Sage notice: …". Tabs get arrow-key handling, like `WeekPanel`.
7. **In-page jumps use next/link or a button**, never a plain `<a href="#…">`. A native fragment
   history entry has no router state, so a later Back (from Track, say) changes the URL but not
   the page. `<Link href="#panel">` when it must work without JS; a button that calls
   `scrollIntoView()` and focuses the target otherwise ("Back to the top").
8. **Say where the data really comes from.** Top Anime's numbers are MyAnimeList's, from its API,
   and each page of the ranking is fetched and cached separately, so a show can shift between
   pages. Never present an artifact of how we fetch as a fact about the source (no "tied" for two
   shows that land on one rank across pages).
9. **Messages come from one place.** Tracker lines live in `lib/anime/trackerConsole.ts` (the
   demo and My List both call it, through the same `TrackQueue` engine), with a `spoken` form where
   "/" or "–" would read badly; the season
   page's in `lib/anime/seasonCopy.ts`. One speech channel per page: a persistent sr-only
   `role="status"`; toasts are visual only. A modal `<dialog>` makes the page (and its status)
   inert, so a dialog that changes something speaks through its own status line.

## Palette

| Role | Value | Tailwind |
|---|---|---|
| Page background | `rgb(18,18,18)` | `bg-[rgb(18,18,18)]` (body) |
| Panel / card surface | `rgb(30,30,30)` | `bg-[rgb(30,30,30)]` |
| Raised / track | `rgb(38,38,38)`, `rgb(53,53,53)` | borders and progress tracks use 53 |
| Night sky | `#050915` `#0a1428` `#0e1d33` | `night-950/900/800` |
| Sage blue (accent, links, eyebrow) | `#95ccff` | `sage` or `text-[#95ccff]` |
| Console text | `#cfe8ff`, `#e6f3ff` | inside console frames and ghost buttons |
| Body text | `#c9d6e6` (subheads), `rgb(200,206,218)` (soft), `rgb(164,164,164)` (muted) | `SOFT_TEXT`, `MUTED_TEXT` |
| Console surface | `#0a1528` / `#0a1428` at 70–90% | `SAGE_FRAME`, `CONSOLE_PANEL` |
| Primary action | `blue-600` → hover `blue-500` | `PRIMARY_BUTTON` |
| Slime | `#5daef1` family | `slime-200…800` |
| Gold (crown, trophies, the Octagram) | `#f5c451` | `gold`. Scarce on purpose: only #1–#8 on Top Anime, crowns, trophies |
| Violet (aurora, Predator haze, premieres) | `rgba(139,92,246,…)`, `violet-600` | |
| Status colors | watching blue · planning violet · completed emerald · paused amber · dropped rose | `STATUS_BADGE_CLASS`, `STATUS_DOT_CLASS` (`lib/anime/statusBadge.ts`) |
| "Soon" / airing | amber-200 text + pulsing amber dot / emerald dot | built into `CountdownText` (the classic card's HUD band takes the same tones, plus violet for a premiere) |

Glows are gradients and box-shadows, **never `filter: blur`**. A section's ambient glow is one
`radial-gradient(closest-side, rgba(93,174,241,.10), …, transparent)` box behind it.

## Type

- **Eyebrow** `EYEBROW_CLASS`: mono, uppercase, wide tracking, sage. Format: `Skill 02 · Predator`.
- **Page h1** `PAGE_TITLE_CLASS`: font-black, moonlit white→`#cfe8ff` gradient text (the
  `hero-title` class adds a solid fallback). Chapter h2s use `CHAPTER_TITLE_CLASS`.
- **Section heading** `SECTION_TITLE_CLASS`: a status dot, the label, a mono count, then a
  gradient hairline that fills the row.
- **Labels** `LABEL_CLASS`: xs, uppercase, semibold, muted. **Stats**: a mono uppercase
  sage `dt` over a `text-2xl font-black tabular-nums` `dd`.
- Mono (`font-mono`) is the Great Sage's voice: console lines, tags, search inputs, URLs.
  Numbers that tick or compare use `tabular-nums`.

## Voice: the Great Sage

System messages are `《Kind》 text.`. Use `<SageLine kind>` for a framed line, `<SageTag kind/>`
inline, and `sageText(kind, text)` for toasts.

| Kind | Use for | Example |
|---|---|---|
| Notice | state changes, welcomes, facts | `Final episode reached. Frieren moved to Completed.` |
| Report | results, empty or failed states | `Stomach contents: 17 shows. 9 still airing.` |
| Question | prompts | `What anime are you looking for?` |
| Answer | confirmations of a choice | `Status set to Watching.` |
| Warning | destructive or degraded | `Remove Frieren? Its progress, score and dates will be lost.` |
| Analyze | filters, edit panels, analysis | `12 of 42 shows match.` |

Skill names are canon Tensura skills, one per feature. Reuse them so a feature has the same
name everywhere:

| Feature / page | Eyebrow | Status |
|---|---|---|
| Season browser (`/anime/<year>/<season>`), countdowns | `Skill 01 · Magic Sense` | done |
| My List (`/user`) | `Skill 02 · Predator` (the list is the Stomach) | done |
| Airing Schedule (`/mylist`) | `Skill 03 · Thought Acceleration` | done |
| Search (`/search`) | `Skill 04 · Great Sage` | done |
| Top Anime (`/topanime`) | `Rankings · The Octagram` (the eight Demon Lords = ranks 1–8) | done |
| Sharing a list | `Thought Communication` | landing quest 3, share strip (share images keep the page's own eyebrow) |
| Signing in | "Naming" (`Naming complete.`); tiers in `lib/landing.ts` | the sign-in page (already signed in: the Named Slime + `Naming complete.`), landing |
| Suggestions | season pages → `Skill 01 · Magic Sense` · errors and 404 → `《Warning》` with a worried slime | errors and 404: done (CardPage pages, season and Top Anime errors); season pages: done |

Keep each line under about 90 characters. One joke per screen is plenty. Running bits that
already exist: "Recommend: predation." for an empty list, "Every legend starts as a slime.",
"Final form reached. For now."

## Components (import, don't copy)

| What | Where | Notes |
|---|---|---|
| Class tokens | `components/theme/tokens.ts` | Focus rings (`FOCUS_RING_CONSOLE` on a #0a1528 console), containers, type, `PANEL`, `CONSOLE_PANEL`, `SAGE_CONSOLE` + `SCANLINES` (the framed console), `CARD` (lift + cover-color glow via `--card-glow`), `EMPTY_PANEL`, buttons (`*_PANEL` variants on rgb-30 surfaces; the primary has a transparent border, its edge in forced colors), `DOORWAY_LINK`, `FIELD`, `SHELF`/`SHELF_ON`/`SHELF_OFF`, `HAIRLINE`, `DAY_TINTS` |
| `PageBanner` | `components/theme/PageBanner.tsx` | The night-sky header for app pages: eyebrow, `lead` (under the eyebrow: /search's box on top), typed-in SageLine (or `sageSlot`: your own node, e.g. a Suspense boundary that streams the line), h1 (`titleId`, focusable, `scroll-mt-20`), sub, `children` (actions, stats), `aside` (right column from 1024px). `asideClassName="hidden lg:block"` for a desktop-only aside (keeps the phone banner short). `sageKey` re-types the Sage line when a live line changes (key it on the text, never the clock) |
| `SearchConsole`, `SearchChips` | `components/theme/SearchConsole.tsx` | The Great Sage search console: a GET `/search` form (next/form, never prefetched: a prefetch of bare /search leaks its title), `size` `large` (stacked on phones) or `compact` (one row, icon-only Analyze below 375px), `showLabel`, `autoFocus`, `onSubmit` for analytics; leaves /search's arrival token. `SearchChips`: "Try:" + the `SEARCH_EXAMPLES` chips (44px hit area, no prefetch). /search and the landing's chapter. `toggle` / `children` / `hrefFor` slots, filled only by /search's results box (`app/search/FilteredSearchConsole.tsx`: a filter toggle, a panel of FilterSelects, Apply / Clear; never auto-submits). Its strings live in `lib/anime/searchConsoleCopy.ts` (the landing imports nothing else of the search copy) |
| `FilterSelect`, `CountBadge`, `FilterIcon` | `components/theme/FilterSelect.tsx` | My List's labelled select (`LABEL_CLASS` + `FIELD`; controlled `value`/`onChange`, or a GET form's `name`/`defaultValue`), the filters toggle's count badge and icon. My List and /search's filter panel |
| `ConsoleFrame`, `SageDoorway` | `components/theme/{ConsoleFrame,SageDoorway}.tsx` | The framed console (glow border, scanlines, corner brackets; hook-free) and a doorway row: icon, `《kind》 line`, "**Lead:** text", one `DOORWAY_LINK`. Doorways ask, so `kind="Question"` |
| `StatGrid`, `Stat` | `components/theme/StatGrid.tsx` | The console stat readout (My List's stats, Top Anime's glance). Optional `note` (with `noteClassName`, e.g. `hidden sm:block`). Four across on phones |
| `TrophyIcon`, `CrownIcon`, `StarIcon` | `components/theme/icons.tsx` | Gold theme icons, aria-hidden. The crown is the Demon Lord slime's |
| `EvolutionCard` | `components/theme/EvolutionCard.tsx` | `layout="banner"` (row on phones, slime on a magic circle from 1024px) or `"stack"` (Quest Log). `gulpKey` replays the gulp when it grows |
| `SagePanel` | `components/theme/SagePanel.tsx` | Empty, error and no-match states: slime (mood) + title + `《Kind》` line + actions |
| `CardPage` | `components/theme/CardPage.tsx` | The owner's one-card pages (404, errors, sign-in, account): a top-anchored Great Sage console card on the night sky. `titleId` (the section's label), `size` ("md" = max-w-md, gap-5; "sm" = max-w-sm, gap-6), `sky` slot (server pages pass `<NightSky variant="page" forest={false} />`; app/error.tsx passes a lazy one). `-mt-2 -mb-8` meet the nav and the footer's horizon, which turns flat navy under a `main[data-card-page]` so the sky runs into the treeline. Tokens: `CARD_*`, `STATUS_*`, `*_BUTTON_CONSOLE`, `TEXT_LINK_CONSOLE` |
| `RetryButton` | `components/theme/RetryButton.tsx` | "Try again" on an error page: `retry()` in a transition, `aria-disabled` while pending, focus returns after a failed retry (10 s module token). Plain `className` (global-error has no Tailwind) |
| `GoogleButton`, `GoogleIcon` | `components/auth/` | Google's light pill (#FFFFFF, #747775 stroke, #1F1F1F, 14/20, 44px) with the kit's gradient G as a PNG (a client leaf, statically imported). Every Google sign-in button uses it; `surface="panel"` on rgb-30 dialogs, `busy` = aria-disabled |
| `ShareLink`, `useCopyListLink` | `components/theme/ShareLink.tsx` | Share strip / copy handler (the Airing Schedule and the landing's schedule chapter). `userId={null}` shows a placeholder link; `onCopy` reports the click. Also clears the landing's Quest 3 |
| `AniListCover` | `components/theme/AniListCover.tsx` | **New AniList covers shown wider than ~100px.** A `srcset` of AniList's files (100/230/460px), so each screen gets the sharpest it needs, up to AniList's largest upload (some new shows only have 230px); `next/image` can't (images are unoptimized). Pass all the cover URLs and a real `sizes`; `fetchPriority="high"` for the likely LCP image |
| `AnimeInfoCard`, `AnimeInfoCardSkeleton` | `components/theme/AnimeInfoCard.tsx` | **The season card (default, "classic").** The owner's original layout in the theme: gel surface warmed by the cover color (`coverTint`), title over genre chips, the cover with the Magic Sense HUD (`CountdownText mode="hud"`: violet premiere, amber last hour, emerald airing) + badge + "★ 8.2 · TV" pill + a perched slime on listed shows (gulps on your own add: `ListToggle`'s `data-in-list` / `data-just-added`), a Great Sage readout (Studio / Premiere / Source / Episodes), the synopsis well (swipe to scroll on touch, hover-scroll with a mouse), a pill add button and the MAL / AniList / Crunchyroll glyphs. Class strings in `tokens.ts` (`INFO_*`), CSS in the "Classic anime card" section of `globals.css`. Labels from `lib/anime/cardLabels.ts`: unknown fields are left out |
| `cardLayout` | `components/theme/cardLayout.ts` | **The one switch:** `ANIME_CARD_LAYOUT = "classic" \| "poster"` for the season page, `/search` and the landing's Magic Sense. `CARD_LAYOUT` bundles the card, skeleton, add control (`ListToggleFillAction` / `ListToggleAction`), grid (`INFO_GRID` / `ANIME_GRID`), cover sizes, waiting skeletons, end-card span and the landing grid |
| `AnimeCard`, `AnimeCardSkeleton` | `components/theme/AnimeCard.tsx` | The poster card (switchable via `cardLayout`; always the Quest Log's `compact`): countdown chip or release status, Premiere/Continuing badge, title, "★ 7.6 · TV · Studio", genres, the add button. Pass the page's add control as `Action`, a component defined at **module level** (the card is memo'd; e.g. `ListToggleAction`). Put cards in an `<ol className={ANIME_GRID}>` of `<li className="flex min-w-0">`, with `SEASON_COVER_SIZES` (the season page and /search) or your grid's own `sizes`. Fields AniList lacks are left out, never "TBA". The skeleton copies its box model exactly |
| `useAnimeDetails` | `components/theme/AnimeDetailsDialog.tsx` | The 《Analyze》 details sheet behind every card: `const { openDetails, sheet } = useAnimeDetails({ Action, fallbackFocusId })`, pass `openDetails` to the cards and render `sheet` once, outside the grid. Bottom sheet on phones; speaks add/remove results itself |
| `LinkPendingGlyph` | `components/theme/LinkPendingGlyph.tsx` | Inside a next/link `<Link>`: its arrow becomes a spinner while the navigation is pending (fixed 16px box, 100 ms delay). For links to static pages without `loading.tsx` |
| `isBackdropEvent` | `components/theme/dialog.ts` | Backdrop-click check for a modal `<dialog>` (ignores its own scrollbar) |
| `consoleToast` | `components/theme/consoleToast.tsx` | The Great Sage console as one toast that replaces the last (slime icon, 《Kind》 tag). Visual only: the page speaks the same line through its own sr-only `role="status"`. A `Warning` line shows the worried slime for 5 s |
| `NewEpisodesChip` | `components/theme/NewEpisodesChip.tsx` | "2 new" (aired, not logged; Watching/Paused only). A 1 s clock leaf; nothing at 0. `onCatchUp` (the owner's card, the demo) makes it the "Log N new" button: the exact count from the shown userData, 20px tall with a 44px hit area on phones, 32px from 768px (`CATCH_UP_CHIP`, `z-[1]` over the bar); visitors and schedule rows keep the span |
| `PlusOneButton` | `components/theme/PlusOneButton.tsx` | My List's +1, three looks on one element (focus stays): "+1" (blue, `PLUS_ONE_READY`), capped (a dashed sage box with an SVG clock, `PLUS_ONE_CAPPED`: every aired episode is logged and the next is known to be ahead, from `airedCount`'s exact count), ✓ (`PLUS_ONE_DONE`). A 1 s clock leaf (`renderedAt` until it hydrates), so the cap lifts the same second the "Log 1 new" chip appears; capped waits for the card's burst line (`settling`). Capped is aria-disabled, not disabled: a press reaches the engine, which says why nothing was logged (`trackerConsole#notAiredMessage`); names from `cappedPlusOneLabel` keep the "+1:" start. Real borders in every state (forced colors). The demo's +1 uses the same tokens |
| `UndoButton` | `components/theme/UndoButton.tsx` | A tracker card's timed "↶ Undo +N", in place of the date · score line (Edit's height, so nothing moves). 10 s drain (`UNDO_MS`), paused while a mouse/pen is over the `data-track-card`, while focus is anywhere in that card, or while the tab is hidden; restarts from full. Labels from `trackerConsole#undoLabel` / `undoTitle`. Driven by `TrackQueue`'s `CardActivity.undo` (`lib/anime/trackQueue.ts`, also the demo's engine) |
| `NextEpisodeLine` | `components/theme/NextEpisodeLine.tsx` | A tracker card's live countdown, or the release status ("Finished airing · 12 eps"). ListCard and TrackerDemo both use it |
| `useMinuteNow` | `components/utils/useMinuteNow.ts` | A per-minute clock for "today"-style labels; keep `useNow()` (1 s) for the countdown leaves only, or whole panels re-render every second |
| `LiveTimersToggle` | `components/theme/LiveTimersToggle.tsx` | Required next to per-second countdowns. `onToggle` for a page's own analytics (only from a client component). `short` shows "Pause timers" below 420px, for a tight controls row (the season page) |
| `NightSky` | `components/home/NightSky.tsx` | `variant="page"` for banners (`hero` and `finale` belong to the landing). `MagicCircle` lives here too: it spins, so put `<PauseParentWhenOffscreen />` (`components/home/Reveal`) in its wrapper outside NightSky. `Treeline` is the forest alone, static (the site footer's; a wider viewBox, so it is another stretch of the woods than a banner's and its pines never get cut flat). `forest={false}` drops the forest band and runs the sky down to the horizon's navy (card pages: the footer's treeline is right below). Every band's viewBox is wide (banners and the finale 7360, the footer 7000) so pines never get cut flat on wide screens. The footer's treeline is mirrored (`FOOTER_TREELINE`): a banner band is the same height, and a different viewBox width only slides the picture, so unmirrored the two would match tree for tree |
| `SageLine`, `SageTag`, `sageText`, `Skill` | `components/home/SageLine.tsx` | `scan="load"` types the line in; `scan="reveal"` needs a `data-reveal` ancestor (landing only) |
| `Slime` | `components/home/Slime.tsx` | `mood`: idle, happy, worried, sage. `tier`: slime, named, demon, lord. Always aria-hidden. Use `size` px, and CSS width for responsive sizes. A slime the root layout renders (the chrome's) takes a fixed `idScope`, or a page slime reached by client navigation reuses its gradient ids |
| `CountdownText` | `components/home/CountdownText.tsx` | Every countdown. `chip` (cards), `row` ("EP 5 in 2h 14m 03s"), `compact` (time only, right-aligned in rows). SSR-safe |
| `NextEpisodes` | `components/mylist/NextEpisodes.tsx` | The hero's Next-episodes card fed by a page's shows (card from 640px, ticker below): the Airing Schedule's and the season banner's. `jump` = the footer/ticker target (`label` shown, `srLabel` ends the ticker's name, `onClick` for an explicit scroll); `restingText`, `headerNote`, `loading` (skeleton rows) |
| `ListToggle` | `components/animev3/ListToggle.tsx` | The add/remove control. Never re-implement list writes |
| Toasts | `app/providers.tsx` | Already themed (console navy, sage border); write messages with `sageText` |
| Site chrome | `components/common/{NavBar,AnimeBar,NavSearch,LogInBox,SiteFooter}.tsx`; tokens `NAV_*`, `MENU_*`, `FOOTER_*` | Already themed on every page; don't restyle it per page. The nav is the top edge of the night sky and ends in `#050915`, so a `PageBanner` (with its `-mt-2`) continues it. Its box is fixed (`h-16` + `mb-2`), it can't widen the page (a size container; the link strip scrolls when it can't fit), and nothing in it may animate on its own (it is sticky over every scroll). Its focusables use `FOCUS_RING_NAV` (an inset outline: the strip clips, and forced colors paints the outline). "Skip to content" (`SkipLink`) is its first Tab stop, and `FocusNudge` keeps keyboard focus out from under it: a page needs exactly one `<main>` and nothing else. The footer is the forest floor (`Treeline`) with the `《Report》` credits and stays `body > footer` |
| Share images | `components/og/` | next/og art for link previews: `OgSky` (`ogStars()`/`ogAurora()`/`ogTreeline()` called as functions), `parts` (`OgEyebrow`, `OgSageBox`, `OgTitle`, `OgSub`, `OgFooter`), `ListShareImage`, `ScheduleShareImage`; fonts in `assets/og`; view models in `components/og/shareCard.ts`. Satori rules: CLAUDE.md §9.24. No clock, no covers, ≤ 300 KB |

The landing-only pieces stay in `components/home` and are not for other pages: `Reveal`
(scroll reveals), `LandingProvider`, `SessionCta`, `trackLanding` analytics.

## Page template

Anatomy, top to bottom: a full-width wrapper → `PageBanner` → `APP_CONTAINER` content
(controls `PANEL` → sections with `SECTION_TITLE_CLASS` → cards or rows) → `SagePanel` for
every empty or error branch. **Dynamic** pages (except the one-card pages, below) add a `loading.tsx` that draws the same banner with
skeleton bars, so the sky doesn't flash when the data arrives, unless the banner depends on the
URL's query: `loading.tsx` can't read it (its server fallback paints first on full loads) and Next
doesn't show it for `?query` navigations within the page. /search instead renders its banner at
once and streams the data through `<Suspense key={query…}>` boundaries (CLAUDE.md §5.4). **Static
or ISR pages with async data (`/`, `/topanime`, the season pages) must not**: the cached HTML would
ship the skeleton and hide the real page in a `<div hidden>` until JavaScript swaps it in
(CLAUDE.md §9.15).

One-card pages (the 404, errors, sign-in, account) use `CardPage` instead of a banner: the owner's
centered card, top-anchored on the night sky, an inline `SageTag` on his own sentence (never an
added Sage line), a worried slime over the emblem on errors. `error.tsx` ships on every page, so its
decor is lazy (`ErrorDecor`). `/auth` is dynamic but has no `loading.tsx`: its signed-out redirect
must happen before streaming (CLAUDE.md §9.6), and after the session check there's no data to wait
for. `/auth/signin` is static with one client island and no `loading.tsx` (§9.15).

```tsx
// app/<route>/layout.tsx: full width, the page draws its own containers.
<main className="min-w-0 w-full overflow-x-clip pb-8">{children}</main>

// The page (client or server component; PageBanner is hook-free).
import PageBanner from "@/components/theme/PageBanner";
import SagePanel from "@/components/theme/SagePanel";
import { APP_CONTAINER, GHOST_BUTTON, PANEL, PRIMARY_BUTTON, SECTION_TITLE_CLASS } from "@/components/theme/tokens";

<PageBanner
  eyebrow="Skill 04 · Great Sage"
  sage={{ kind: "Question", text: "What anime are you looking for?" }}
  title="Search"
  sub="All of AniList: older seasons, movies, ONAs."
  aside={/* optional: EvolutionCard / NextEpisodes / a console card */ undefined}
>
  <div className="mt-6 flex flex-wrap gap-3">{/* GHOST_BUTTON links, LiveTimersToggle */}</div>
</PageBanner>

<div className={`${APP_CONTAINER} flex flex-col gap-8`}>
  <section aria-label="Controls" className={`${PANEL} p-3 sm:p-4`}>{/* SHELF chips, FIELD inputs */}</section>
  <section aria-labelledby="results-title" className="flex min-w-0 flex-col gap-4">
    <h2 id="results-title" className={SECTION_TITLE_CLASS}>
      Results <span className="font-mono text-sm font-normal text-[rgb(164,164,164)]">30</span>
      <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-gradient-to-r from-[#95ccff]/30 to-transparent" />
    </h2>
    {/* grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] of CARD items */}
  </section>
</div>

{/* Empty or error: */}
<SagePanel kind="Report" mood="worried" title="Nothing found"
  actions={<><a className={PRIMARY_BUTTON}>Browse this season</a><a className={GHOST_BUTTON}>Top Anime</a></>}>
  No anime found for “xyz”. This search skips adult titles. Try the romaji title.
</SagePanel>
```

When a source has no cover color (MyAnimeList), `--card-glow` comes from something real, like the
rank tier: gold `rgba(245,196,81,.45)` for #1–#8, sage `rgba(93,174,241,.55)` otherwise, with a
gold overlay span rather than a CARD border override.

Cards follow the landing: `CARD` + `style={{ "--card-glow": coverColor }}`, covers on a
`coverImage.color` background, `rounded-md` 2:3 art, title `line-clamp-2`, a status badge with
`ring-1 ring-inset`, a progress bar `h-1.5` (blue, or emerald when completed). A light
`animate-[rise-in_400ms_ease-out_both]` on mount makes filtered or moved cards land softly.

Fun that has earned its place, without being noise:
- The slime reacts to real events: `gulpKey` grows (an add, a completion), `mood="happy"` on
  success, `worried` on failure.
- Tabs and day strips use the `ScheduleDemo` pattern: `DAY_TINTS` dots, count dots, a ring on
  today.
- `url-shimmer` on share links, `sage-scan` typing on the banner line, magicules and stars come
  free with `NightSky`.

## Done means

1. `npm run check` passes (typecheck, lint with the React Compiler rules, unit tests).
2. Screenshots of every state (owner, visitor, empty, error, loading) at 1440, 820 and
   390 px look right, with no horizontal scroll. How: [screenshots.md](screenshots.md).
3. SSR and hydration render the same text (no time-dependent output before `useNow()`).
4. The landing demo for this feature still matches the page (rule 1).
5. CLAUDE.md's route, feature and directory maps describe the new files.
