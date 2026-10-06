/**
 * Every line the season page (/anime/<year>/<season>) prints or speaks, and
 * the condition it shows under. Pure and clock-free (callers pass `nowMs`),
 * so each line is tested for being literally true for any data.
 *
 * Scope rule: the season list is every format of AniList's filing for the
 * season minus adult titles (components/utils/anilist-queries/allCurrAnimeTag.ts),
 * and continuing series are TV only. So a season total carries
 * LINEUP_EXCLUDING in the same sentence and says "of AniList's" (AniList
 * files some ONAs under no season), every continuing count says "TV series",
 * and a "none" claim is about this page ("here") next to LINEUP_NOTE (season
 * shows) or PAGE_NOTE (the whole page). Never "AniList lists no …".
 */
import { formatAirDate, nextAiring } from "./airing";
import type { FormatKey } from "./seasonFormats";
import { compareByPopularity, inSeasonAiringAt, seasonWindow, type SeasonWindow, type SortMode } from "./seasonOrder";
import type { AnimeMedia } from "./types";
import { AIRED_GRACE_SECONDS, formatLabel } from "@/lib/landing";
import { SEASON_LABELS, SEASON_MONTHS, type SeasonName } from "@/lib/season";

export const SEASON_EYEBROW = "Skill 01 · Magic Sense";
/** The landing's Magic Sense line (components/home/AiringNext.tsx), and the current season's banner line. */
export const MAGIC_SENSE_LINE = "Magic Sense active. Incoming episodes detected.";

export const LINEUP_EXCLUDING = "excluding adult titles";
export const LINEUP_NOTE = "This page skips adult titles.";
/** For claims about the whole page (season shows and continuing series). */
export const PAGE_NOTE = "Adult titles are skipped; continuing series are TV only.";

export type SeasonPhase = "upcoming" | "current" | "past";

export function seasonPhase(year: number, season: SeasonName, nowMs: number): SeasonPhase {
  const { start, end } = seasonWindow(year, season);
  return nowMs < start ? "upcoming" : nowMs >= end ? "past" : "current";
}

/** "Fall 2026" */
export const seasonLabelOf = (year: number, season: SeasonName) => `${SEASON_LABELS[season]} ${year}`;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ------------------------------------------------------------------------- */
/* Banner                                                                      */

export interface SageLineText {
  kind: "Notice" | "Report" | "Warning";
  text: string;
}

/**
 * The banner's Great Sage line. `loaded` is every show the page has (season
 * shows and continuing series, whatever the toggle says): "detected" is an
 * existence claim, and more data can only add shows.
 */
export function seasonSageLine({
  year,
  season,
  loaded,
  nowMs,
  empty,
}: {
  year: number;
  season: SeasonName;
  loaded: readonly AnimeMedia[];
  nowMs: number;
  empty: boolean;
}): SageLineText {
  const label = seasonLabelOf(year, season);
  const phase = seasonPhase(year, season, nowMs);
  if (empty) {
    return { kind: "Report", text: `No ${label} shows ${phase === "past" ? "here" : "here yet"}. ${PAGE_NOTE}` };
  }
  if (phase === "past") return { kind: "Report", text: `${label} has ended. Magic Sense is reading the archive.` };
  const cutoff = nowMs / 1000 - AIRED_GRACE_SECONDS;
  const incoming = loaded.some((media) => (nextAiring(media)?.airingAt ?? 0) > cutoff);
  if (phase === "current") {
    return {
      kind: "Notice",
      text: incoming ? MAGIC_SENSE_LINE : "Magic Sense active. Air dates appear as AniList schedules them.",
    };
  }
  const starts = `${label} starts ${SEASON_MONTHS[season].from} 1.`;
  return {
    kind: "Notice",
    text: incoming
      ? `${starts} Incoming episodes detected.`
      : `${starts} Countdowns appear once AniList schedules episodes.`,
  };
}

/** The sub's scope sentence (what the page lists), by phase. */
export function seasonSubScope(phase: SeasonPhase, label: string, carryOverIncluded: boolean): string {
  const lineup = `AniList's ${label} lineup minus adult titles`;
  if (!carryOverIncluded) return `${lineup}.`;
  if (phase === "upcoming") return `${lineup}, plus TV series expected to continue into it.`;
  if (phase === "past") return `${lineup}, plus TV series that continued into it.`;
  return `${lineup}, plus TV series continuing from earlier seasons.`;
}

/** The banner's Next-episodes rows: in-season episodes not aired over 30 min ago, soonest first. */
export function nextUpRows(displayed: readonly AnimeMedia[], win: SeasonWindow, nowMs: number): AnimeMedia[] {
  const cutoff = nowMs - AIRED_GRACE_SECONDS * 1000;
  return displayed
    .filter((media) => {
      const atMs = inSeasonAiringAt(media, win);
      return atMs !== Number.POSITIVE_INFINITY && atMs > cutoff;
    })
    .sort((a, b) => inSeasonAiringAt(a, win) - inSeasonAiringAt(b, win) || compareByPopularity(a, b));
}

/**
 * The Next-episodes card with no rows. In next-episode terms, because that is
 * all the data says (a show's earliest scheduled episode).
 */
export function nextUpResting(phase: "upcoming" | "current", label: string): string {
  return phase === "current"
    ? `None of the shows below has an episode coming up before ${label} ends.`
    : `None of the shows below has its next episode in ${label} yet.`;
}

/* ------------------------------------------------------------------------- */
/* Counts and the heading                                                      */

/** "72", or "50+" while pages are missing (or AniList's order shifted). */
export const countLabel = (n: number, exact: boolean) => (exact ? `${n}` : `${n}+`);
export const spokenCount = (n: number, exact: boolean) => (exact ? `${n}` : `at least ${n}`);
/** "21", or "21+" when a carry-over list hit AniList's 50-item cap. */
export const continuingLabel = (c: number, capped: boolean) => (capped ? `${c}+` : `${c}`);
export const spokenContinuing = (c: number, capped: boolean) => (capped ? `at least ${c}` : `${c}`);

/** The heading's visible hidden count: " · 26 hidden" ("10+" while counts are lower bounds); "" for none. */
export const hiddenLabel = (hidden: number, exact: boolean) => (hidden > 0 ? ` · ${countLabel(hidden, exact)} hidden` : "");

/** The shows heading's spoken counts: ": 70, plus 21 continuing series; 26 more in hidden formats". */
export function headingSr({
  n,
  exact,
  c,
  capped,
  showContinuing,
  hidden = 0,
}: {
  /** Season shows listed (after the format filter). */
  n: number;
  exact: boolean;
  /** Continuing series listed or listable (0 when they weren't fetched, or are hidden with TV). */
  c: number;
  capped: boolean;
  showContinuing: boolean;
  /** Season shows in hidden formats. */
  hidden?: number;
}): string {
  const continuing = showContinuing && c > 0 ? `, plus ${spokenContinuing(c, capped)} continuing series` : "";
  const more = hidden > 0 ? `; ${spokenCount(hidden, exact)} more in hidden formats` : "";
  return `: ${spokenCount(n, exact)}${continuing}${more}`;
}

/* ------------------------------------------------------------------------- */
/* Formats                                                                     */

/** A format chip's label: the cards' own pill label ("TV Short"), or "Other". */
export const formatChipLabel = (key: FormatKey) => (key === "OTHER" ? "Other" : (formatLabel(key) ?? key));

/** "TV Short and ONA" / "TV, Movie and ONA". */
export function formatList(keys: readonly FormatKey[]) {
  const labels = keys.map(formatChipLabel);
  return labels.length <= 1 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/** The format chips' tooltips (and accessible descriptions): AniList's own definitions, shortened. */
export const FORMAT_TITLES: Record<FormatKey, string> = {
  TV: "Broadcast on TV.",
  TV_SHORT: "Broadcast on TV, under 15 minutes an episode.",
  MOVIE: "Released in theaters.",
  SPECIAL: "Extra episodes, pilots, picture dramas and the like.",
  OVA: "Released straight to DVD or Blu-ray.",
  ONA: "Released online first, or only on streaming. AniList files some under no season.",
  MUSIC: "A music video. AniList files most under no season.",
  OTHER: "AniList lists no format for these, or one this page doesn't know.",
};

export const CONTINUING_TITLE = "TV series that started in an earlier season";
/** The blocked continuing chip's tooltip while TV is hidden (`on`: their toggle is on). */
export const CONTINUING_TV_HIDDEN_TITLE = (on: boolean) =>
  on ? "Continuing series are TV series: show TV to list them" : "Continuing series are TV series: show TV, then turn them on";

/** The Next-episodes card while the format chips list nothing. */
export const NEXT_UP_NONE_IN_FORMATS = "No shows are listed in the chosen formats.";

/**
 * The panel in the grid's place when the format filter lists nothing.
 * `n` = season shows loaded (all hidden); `cHidden` = continuing series
 * hidden too (with TV, or by their own toggle).
 */
export function formatsHiddenCopy({
  label,
  n,
  exact,
  formats,
  cHidden,
  capped,
}: {
  label: string;
  n: number;
  exact: boolean;
  /** The hidden formats holding those shows, in chip order. */
  formats: readonly FormatKey[];
  cHidden: number;
  capped: boolean;
}): { title: string; text: string } {
  const continuing =
    cHidden > 0
      ? `${capped ? `At least ${cHidden}` : cHidden} continuing TV series ${cHidden === 1 && !capped ? "is" : "are"} hidden${
          n > 0 ? " too" : " with TV"
        }.`
      : "";
  let shows = "";
  if (n > 0) {
    const where = `${formats.length === 1 ? "a hidden format" : "hidden formats"}: ${formatList(formats)}`;
    shows = exact
      ? n === 1
        ? `The only ${label} show here is in ${where}.`
        : `All ${n} ${label} shows here are in ${where}.`
      : `The ${n} ${label} ${plural(n, "show", "shows")} loaded ${plural(n, "is", "are")} in ${where}.`;
  }
  return { title: "No shows listed in these formats", text: [shows, continuing].filter(Boolean).join(" ") };
}

/** Above a grid of continuing series only, when every season show is in a hidden format. */
export const formatsHiddenNote = (label: string, exact: boolean) =>
  `Every ${label} show ${exact ? "here" : "loaded"} is in a hidden format. Continuing series are still listed.`;

/* ------------------------------------------------------------------------- */
/* Controls                                                                    */

export const SORT_NAMES: Record<SortMode, string> = { countdown: "Countdown", popularity: "Popularity" };

/** The line under the sort buttons: what the order means for this season. */
export function sortHint({
  sort,
  anyInSeason,
  phase,
  label,
}: {
  sort: SortMode;
  /** Some displayed show has its next episode in the season. */
  anyInSeason: boolean;
  phase: SeasonPhase;
  label: string;
}): string {
  if (sort === "popularity") return "Most popular on AniList first: how many users have each show on a list.";
  if (anyInSeason) return `Soonest ${label} episode first, the rest by popularity.`;
  if (phase === "past") return `${label} has ended, so countdown order matches popularity.`;
  return phase === "upcoming"
    ? `None of these shows has its next episode in ${label} yet, so this matches popularity order.`
    : `None of these shows has its next episode in ${label}, so this matches popularity order.`;
}

/* ------------------------------------------------------------------------- */
/* Grid notices                                                                */

/** The divider after the pinned cards (countdown mode). */
export const dividerText = (k: number) =>
  `${k} ${plural(k, "show below airs", "shows below air")} sooner than some above. Re-sort to put them in order.`;

/** A later page failed to load. `shown` = cards on the page (continuing included). */
export const loadErrorText = (label: string, shown: number) =>
  `Couldn't load the rest of ${label} from AniList. Showing ${shown} ${plural(shown, "show", "shows")} so far.`;

/** The end card's lines: the 《Report》, a line about hidden formats, and one about continuing series. */
export function endCardText({
  label,
  n,
  c,
  capped,
  orderShifted,
  showContinuing,
  carryOverIncluded,
  hidden = 0,
  hiddenFormats = [],
  continuingHiddenWithTv = false,
}: {
  label: string;
  /** Season shows loaded, in every format (continuing series not included). */
  n: number;
  c: number;
  capped: boolean;
  /** A later page repeated a show (AniList's order moved between requests). */
  orderShifted: boolean;
  showContinuing: boolean;
  carryOverIncluded: boolean;
  /** How many of the `n` are in hidden formats. */
  hidden?: number;
  /** The hidden formats holding them, in chip order. */
  hiddenFormats?: readonly FormatKey[];
  /** TV is hidden, so the continuing series (all TV) are too. */
  continuingHiddenWithTv?: boolean;
}): { report: string; hidden: string | null; continuing: string | null } {
  if (n === 0) {
    return {
      report: capped
        ? `${c}+ continuing TV series sensed. AniList may list more.`
        : `All ${c} continuing TV series sensed, ${LINEUP_EXCLUDING}.`,
      hidden: null,
      continuing: continuingHiddenWithTv
        ? `${capped ? `At least ${c}` : c} of them ${c === 1 && !capped ? "is" : "are"} hidden with TV.`
        : null,
    };
  }
  const report = orderShifted
    ? `${n} ${label} ${plural(n, "show", "shows")} loaded. AniList's order shifted, so some may be missing.`
    : n === 1
      ? `AniList's only ${label} show sensed, ${LINEUP_EXCLUDING}.`
      : `All ${n} of AniList's ${label} shows sensed, ${LINEUP_EXCLUDING}.`;
  let hiddenLine: string | null = null;
  if (hidden > 0) {
    const where = `${hiddenFormats.length === 1 ? "a hidden format" : "hidden formats"}: ${formatList(hiddenFormats)}`;
    hiddenLine =
      hidden === n
        ? n === 1
          ? `It's in ${where}.`
          : `All ${n} are in ${where}.`
        : `${hidden} of them ${hidden === 1 ? "is" : "are"} in ${where}.`;
  }
  let continuing: string | null = null;
  const hiddenCount = (count: number) =>
    capped ? `At least ${count} continuing TV series are hidden` : `${count} continuing TV series ${plural(count, "is", "are")} hidden`;
  if (!carryOverIncluded) continuing = "Continuing series didn't load from AniList.";
  else if (c > 0 && continuingHiddenWithTv) continuing = `${hiddenCount(c)} with TV.`;
  else if (c > 0 && showContinuing) {
    continuing = capped ? `Plus at least ${c} continuing TV series.` : `Plus ${c} continuing TV series.`;
  } else if (c > 0) continuing = `${hiddenCount(c)}.`;
  return { report, hidden: hiddenLine, continuing };
}

/** The end card's small print: how fresh the data is. */
export const endCardNote = (dataAtMs: number, orderShifted: boolean) =>
  `${orderShifted ? "Reload to recount. " : ""}AniList data from ${formatAirDate(Math.floor(dataAtMs / 1000))} or later.`;

/* ------------------------------------------------------------------------- */
/* Empty and continuing-only                                                   */

/** Nothing at all on the page. */
export function emptyCopy(phase: SeasonPhase, carryOverIncluded: boolean): { title: string; text: string } {
  const past = phase === "past";
  const text = past ? PAGE_NOTE : `Shows appear here as AniList lists them. ${PAGE_NOTE}`;
  return {
    title: past ? "No shows here" : "No shows here yet",
    text: carryOverIncluded ? text : `${text} Continuing series didn't load from AniList.`,
  };
}

/** No season shows, and the continuing series are hidden by the toggle. */
export function continuingHiddenCopy(phase: SeasonPhase, c: number, capped: boolean): { title: string; text: string } {
  const hidden = capped
    ? `At least ${c} continuing TV series are hidden.`
    : `${c} continuing TV series ${plural(c, "is", "are")} hidden.`;
  return { title: phase === "past" ? "No new shows here" : "No new shows here yet", text: `${hidden} ${LINEUP_NOTE}` };
}

/** No season shows; the continuing series are shown. */
export function onlyContinuingCopy(phase: SeasonPhase, label: string): string {
  if (phase === "upcoming") return `No new ${label} shows here yet. These series are expected to continue into it.`;
  if (phase === "past") return `No new ${label} shows here. These series started earlier and continued into it.`;
  return `No new ${label} shows here yet. These series started earlier and continue into it.`;
}

/* ------------------------------------------------------------------------- */
/* No-JS and links                                                             */

/** AniList's own season browser (the no-JS way to see past the first 12 cards). */
export const anilistSeasonUrl = (year: number, season: SeasonName) =>
  `https://anilist.co/search/anime?year=${year}&season=${season.toUpperCase()}`;

export const noscriptText = (shown: number) =>
  `Without JavaScript, only the first ${shown} ${plural(shown, "show appears", "shows appear")} here.`;

/** The route's meta description. */
export const seasonDescription = (year: number, season: SeasonName) => {
  const { from, to } = SEASON_MONTHS[season];
  return `${seasonLabelOf(year, season)} anime on AniList (${from} – ${to} ${year}), ${LINEUP_EXCLUDING}, plus TV series continuing from earlier seasons: live countdowns to the next episode, studios, scores and synopses. Sort by countdown or popularity, filter by format and add shows to your list.`;
};

/**
 * The landing's season stat (components/home/AiringNext.tsx): the season
 * page's lineup, the same query, so the same scope.
 */
export function landingSeasonStat({
  label,
  showCount,
  continuingCount,
  continuingCapped,
  preview,
}: {
  label: string;
  /** "96", "150+" or "50+" (lib/landing.ts#seasonShowCount). */
  showCount: string;
  continuingCount: number | null;
  continuingCapped: boolean;
  preview: boolean;
}): string {
  const continuing = continuingCount
    ? `, plus ${continuingCapped ? "at least " : ""}${continuingCount} TV series ${
        // Before the season starts, which series carry on is an estimate (lib/anime/carryOver.ts).
        preview ? "expected to continue from earlier seasons" : "continuing from earlier seasons"
      }`
    : "";
  return `AniList lists ${showCount} ${label} shows, ${LINEUP_EXCLUDING}${continuing}.`;
}

/* ------------------------------------------------------------------------- */
/* The page's one spoken channel                                               */

export const STATUS = {
  loadingMore: (label: string) => `Loading more ${label} shows…`,
  loadedMore: (label: string) => `More ${label} shows loaded.`,
  loadFailed: (label: string) => `Couldn't load more ${label} shows from AniList. Retry is after the last show.`,
  refreshed: "Updated with the latest schedule from AniList.",
  continuingLoaded: "Continuing series loaded from AniList.",
  sorted: (mode: SortMode) => `Sorted by ${mode}.`,
  /** `shown` = the continuing series that will actually render (after the popularity floor). */
  continuing: (on: boolean, shown: number, label: string) =>
    !on
      ? "Continuing series hidden."
      : shown > 0
        ? `Showing ${shown} continuing series.`
        : `Continuing series appear as more of ${label} loads.`,
  resorted: "Re-sorted: soonest episode first.",
  /**
   * After a format chip or "Show every format": what the list holds now
   * (computed from the next state, never the next render). `key` null =
   * every format shown. `tvContinuing` = continuing series TV took with it
   * (hidden) or brought back (shown).
   */
  formats: ({
    key,
    shown,
    label,
    n,
    c,
    complete,
    tvContinuing = 0,
  }: {
    key: FormatKey | null;
    shown: boolean;
    label: string;
    /** Season shows listed after the change. */
    n: number;
    /** Continuing series listed after the change. */
    c: number;
    complete: boolean;
    tvContinuing?: number;
  }) => {
    const soFar = complete ? "" : " so far";
    // "Show every format" on a season with no season shows: only what's listed.
    if (key === null && n === 0) return c > 0 ? `Every format shown. ${c} continuing series listed.` : "Every format shown.";
    const what =
      key === null
        ? "Every format shown"
        : `${formatChipLabel(key)} ${shown ? "shown" : "hidden"}${
            tvContinuing > 0
              ? shown
                ? `, with the ${tvContinuing} continuing series`
                : `, and the ${tvContinuing} continuing series with it`
              : ""
          }`;
    const plus = c > 0 && !(shown && tvContinuing > 0) ? `, plus ${c} continuing series` : "";
    const listed =
      n > 0
        ? `${n} ${label} ${plural(n, "show", "shows")} listed${soFar}${plus}.`
        : `None of the ${label} shows loaded${soFar} is in the chosen formats${c > 0 ? `; ${c} continuing series listed` : ""}.`;
    return `${what}. ${listed}`;
  },
  /** A press on the blocked continuing chip while TV is hidden (`on`: their toggle is on). */
  continuingNeedsTv: (on: boolean) =>
    on ? "Continuing series are TV series. Show TV to list them." : "Continuing series are TV series. Show TV, then turn them on.",
} as const;
