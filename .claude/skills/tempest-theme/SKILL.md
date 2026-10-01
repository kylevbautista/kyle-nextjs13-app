---
name: tempest-theme
description: The kylevb design system ("Tempest" theme, from the landing page). Load it BEFORE redesigning, restyling, theming or building the UI of any page or component in this repo — "redesign /search", "make X look like the homepage", "make it fun / immersive", a new page, a new empty or error state. It covers the look, the copy voice, the shared components in components/theme, a page template, and the screenshot check.
---

# Tempest theme: the kylevb design system

The landing page (`/`) set the look the owner wants everywhere: a fan theme built on
*That Time I Got Reincarnated as a Slime* (Tensura). It has a night sky over the Jura forest,
the **Great Sage** speaking in system messages (`《Notice》 …`), and an original slime mascot
that **evolves as your list grows**. It is playful in its framing and exact in its content.

My List (`/user/<id>`), the Airing Schedule (`/mylist/<id>`) and Top Anime (`/topanime`) were
redesigned with this kit. Read one of them before starting a new page:
`app/user/_client/MyList.tsx` and `components/mylist/AiringSchedule.tsx` for dynamic, signed-in
pages; `app/topanime/` for a static ISR page (server-rendered banner and asides, one client island,
pure `ranking.ts` helpers with tests).

## The rules

1. **Demos and real pages match.** The landing demos real features: `TrackerDemo` shows My
   List's card, `ScheduleDemo` shows the Airing Schedule's week panel, `HeroNextUp` shows the
   Next-episodes card. A page that has a demo uses the demo's markup and classes. If you change
   one side, change the other in the same PR. The owner noticed when they drifted apart.
2. **Real data only.** Stats, counts, tiers and messages come from actual list or AniList data.
   Never show placeholder numbers or invented "activity".
3. **The theme is a costume.** Every label still says plainly what it is. "Stomach contents:
   17 shows. 9 still airing." works because it is true and readable. A pun must never replace
   the information.
4. **CLAUDE.md still rules.** Use `useNow()` for anything time-based (null until hydrated).
   Show times in Pacific. No `Date.now()` in render: server components use
   `new Date().getTime()`, like `app/anime/layout.tsx`. Sanitize descriptions, put `min-w-0`
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
8. **Say where the data really comes from.** Top Anime's numbers are MyAnimeList's as Jikan
   reports them: Jikan refreshes shows separately, so ranks can repeat or skip. Never present an
   upstream artifact as a fact about the source (no "tied" for a repeated Jikan rank).

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
| "Soon" / airing | amber-200 text + pulsing amber dot / emerald dot | built into `CountdownText` |

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
| Season browser, countdowns | `Skill 01 · Magic Sense` | landing |
| My List (`/user`) | `Skill 02 · Predator` (the list is the Stomach) | done |
| Airing Schedule (`/mylist`) | `Skill 03 · Thought Acceleration` | done |
| Search (`/search`) | `Skill 04 · Great Sage` | landing; page not yet redesigned |
| Top Anime (`/topanime`) | `Rankings · The Octagram` (the eight Demon Lords = ranks 1–8) | done |
| Sharing a list | `Thought Communication` | landing quest 3, share strip |
| Signing in | "Naming" (`Naming complete.`); tiers in `lib/landing.ts` | landing |
| Suggestions | season pages → `Skill 01 · Magic Sense` · errors and 404 → `《Warning》` with a worried slime | not built |

Keep each line under about 90 characters. One joke per screen is plenty. Running bits that
already exist: "Recommend: predation." for an empty list, "Every legend starts as a slime.",
"Final form reached. For now."

## Components (import, don't copy)

| What | Where | Notes |
|---|---|---|
| Class tokens | `components/theme/tokens.ts` | Focus rings, containers, type, `PANEL`, `CONSOLE_PANEL`, `CARD` (lift + cover-color glow via `--card-glow`), `EMPTY_PANEL`, buttons (`*_PANEL` variants on rgb-30 surfaces), `FIELD`, `SHELF`/`SHELF_ON`/`SHELF_OFF`, `HAIRLINE`, `DAY_TINTS` |
| `PageBanner` | `components/theme/PageBanner.tsx` | The night-sky header for app pages: eyebrow, typed-in SageLine, h1 (`titleId`, focusable, `scroll-mt-20`), sub, `children` (actions, stats), `aside` (right column from 1024px). `asideClassName="hidden lg:block"` for a desktop-only aside (keeps the phone banner short) |
| `StatGrid`, `Stat` | `components/theme/StatGrid.tsx` | The console stat readout (My List's stats, Top Anime's glance). Optional `note` names the show behind a fact |
| `TrophyIcon`, `CrownIcon`, `StarIcon` | `components/theme/icons.tsx` | Gold theme icons, aria-hidden. The crown is the Demon Lord slime's |
| `EvolutionCard` | `components/theme/EvolutionCard.tsx` | `layout="banner"` (row on phones, slime on a magic circle from 1024px) or `"stack"` (Quest Log). `gulpKey` replays the gulp when it grows |
| `SagePanel` | `components/theme/SagePanel.tsx` | Empty, error and no-match states: slime (mood) + title + `《Kind》` line + actions |
| `ShareLink`, `useCopyListLink` | `components/theme/ShareLink.tsx` | Share strip / copy handler. Also clears the landing's Quest 3 |
| `LiveTimersToggle` | `components/theme/LiveTimersToggle.tsx` | Required next to per-second countdowns |
| `NightSky` | `components/home/NightSky.tsx` | `variant="page"` for banners (`hero` and `finale` belong to the landing). `MagicCircle` lives here too: it spins, so put `<PauseParentWhenOffscreen />` (`components/home/Reveal`) in its wrapper outside NightSky |
| `SageLine`, `SageTag`, `sageText`, `Skill` | `components/home/SageLine.tsx` | `scan="load"` types the line in; `scan="reveal"` needs a `data-reveal` ancestor (landing only) |
| `Slime` | `components/home/Slime.tsx` | `mood`: idle, happy, worried, sage. `tier`: slime, named, demon, lord. Always aria-hidden. Use `size` px, and CSS width for responsive sizes |
| `CountdownText` | `components/home/CountdownText.tsx` | Every countdown. `chip` (cards), `row` ("EP 5 in 2h 14m 03s"), `compact` (time only, right-aligned in rows). SSR-safe |
| `NextEpisodes` | `components/mylist/NextEpisodes.tsx` | The hero's Next-episodes card fed by a list (card from 640px, ticker below) |
| `ListToggle` | `components/animev3/ListToggle.tsx` | The add/remove control. Never re-implement list writes |
| Toasts | `app/providers.tsx` | Already themed (console navy, sage border); write messages with `sageText` |

The landing-only pieces stay in `components/home` and are not for other pages: `Reveal`
(scroll reveals), `LandingProvider`, `SessionCta`, `trackLanding` analytics.

## Page template

Anatomy, top to bottom: a full-width wrapper → `PageBanner` → `APP_CONTAINER` content
(controls `PANEL` → sections with `SECTION_TITLE_CLASS` → cards or rows) → `SagePanel` for
every empty or error branch. **Dynamic** pages add a `loading.tsx` that draws the same banner with
skeleton bars, so the sky doesn't flash when the data arrives. **Static or ISR pages with async
data (`/`, `/topanime`) must not**: the cached HTML would ship the skeleton and hide the real page
in a `<div hidden>` until JavaScript swaps it in (CLAUDE.md §9.15).

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
  No anime matched “xyz”. Try the romaji title.
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
