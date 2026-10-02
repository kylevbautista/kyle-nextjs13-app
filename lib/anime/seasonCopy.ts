/**
 * Every line the season page (/anime/<year>/<season>) prints or speaks, and
 * the condition it shows under. Pure and clock-free (callers pass `nowMs`),
 * so each line is tested for being literally true for any data.
 *
 * Scope rule: the season query leaves out ONAs, TV shorts and adult titles
 * (components/utils/anilist-queries/allCurrAnimeTag.ts), so a total carries
 * LINEUP_EXCLUDING in the same sentence, and a "none" claim is about this
 * page ("here") next to LINEUP_NOTE. Never "AniList lists no …".
 */
import { formatAirDate, nextAiring } from "./airing";
import { compareByPopularity, inSeasonAiringAt, seasonWindow, type SeasonWindow, type SortMode } from "./seasonOrder";
import type { AnimeMedia } from "./types";
import { AIRED_GRACE_SECONDS } from "@/lib/landing";
import { SEASON_LABELS, SEASON_MONTHS, type SeasonName } from "@/lib/season";

export const SEASON_EYEBROW = "Skill 01 · Magic Sense";
/** The landing's Magic Sense line (components/home/AiringNext.tsx), and the current season's banner line. */
export const MAGIC_SENSE_LINE = "Magic Sense active. Incoming episodes detected.";

export const LINEUP_EXCLUDING = "excluding ONAs, TV shorts and adult titles";
export const LINEUP_NOTE = "This page skips ONAs, TV shorts and adult titles.";

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
    return { kind: "Report", text: `No ${label} shows ${phase === "past" ? "here" : "here yet"}. ${LINEUP_NOTE}` };
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
  const lineup = `AniList's ${label} lineup minus ONAs, TV shorts and adult titles`;
  if (!carryOverIncluded) return `${lineup}.`;
  if (phase === "upcoming") return `${lineup}, plus series expected to continue into it.`;
  if (phase === "past") return `${lineup}, plus series that continued into it.`;
  return `${lineup}, plus series continuing from earlier seasons.`;
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

/** The shows heading's spoken counts: ": 72, plus 21 continuing series". */
export function headingSr({
  n,
  exact,
  c,
  capped,
  showContinuing,
}: {
  n: number;
  exact: boolean;
  /** Continuing series known to the page (0 when they weren't fetched). */
  c: number;
  capped: boolean;
  showContinuing: boolean;
}): string {
  const continuing = showContinuing && c > 0 ? `, plus ${spokenContinuing(c, capped)} continuing series` : "";
  return `: ${spokenCount(n, exact)}${continuing}`;
}

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

/** The end card's lines: the 《Report》 and an optional line about continuing series. */
export function endCardText({
  label,
  n,
  c,
  capped,
  orderShifted,
  showContinuing,
  carryOverIncluded,
}: {
  label: string;
  /** Season shows loaded (continuing series not included). */
  n: number;
  c: number;
  capped: boolean;
  /** A later page repeated a show (AniList's order moved between requests). */
  orderShifted: boolean;
  showContinuing: boolean;
  carryOverIncluded: boolean;
}): { report: string; continuing: string | null } {
  if (n === 0) {
    return {
      report: capped
        ? `${c}+ continuing series sensed. AniList may list more.`
        : `All ${c} continuing series sensed, ${LINEUP_EXCLUDING}.`,
      continuing: null,
    };
  }
  const report = orderShifted
    ? `${n} ${label} ${plural(n, "show", "shows")} loaded. AniList's order shifted, so some may be missing.`
    : n === 1
      ? `The only ${label} show sensed, ${LINEUP_EXCLUDING}.`
      : `All ${n} ${label} shows sensed, ${LINEUP_EXCLUDING}.`;
  let continuing: string | null = null;
  if (!carryOverIncluded) continuing = "Continuing series didn't load from AniList.";
  else if (c > 0 && showContinuing) {
    continuing = capped ? `Plus at least ${c} continuing series.` : `Plus ${c} continuing series.`;
  } else if (c > 0) {
    continuing = capped
      ? `At least ${c} continuing series are hidden.`
      : `${c} continuing series ${plural(c, "is", "are")} hidden.`;
  }
  return { report, continuing };
}

/** The end card's small print: how fresh the data is. */
export const endCardNote = (dataAtMs: number, orderShifted: boolean) =>
  `${orderShifted ? "Reload to recount. " : ""}AniList data from ${formatAirDate(Math.floor(dataAtMs / 1000))} or later.`;

/* ------------------------------------------------------------------------- */
/* Empty and continuing-only                                                   */

/** Nothing at all on the page. */
export function emptyCopy(phase: SeasonPhase, carryOverIncluded: boolean): { title: string; text: string } {
  const past = phase === "past";
  const text = past ? LINEUP_NOTE : `Shows appear here as AniList lists them. ${LINEUP_NOTE}`;
  return {
    title: past ? "No shows here" : "No shows here yet",
    text: carryOverIncluded ? text : `${text} Continuing series didn't load from AniList.`,
  };
}

/** No season shows, and the continuing series are hidden by the toggle. */
export function continuingHiddenCopy(phase: SeasonPhase, c: number, capped: boolean): { title: string; text: string } {
  const hidden = capped
    ? `At least ${c} continuing series are hidden.`
    : `${c} continuing series ${plural(c, "is", "are")} hidden.`;
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
  return `${seasonLabelOf(year, season)} anime on AniList (${from} – ${to} ${year}), ${LINEUP_EXCLUDING}, plus series continuing from earlier seasons: live countdowns to the next episode, studios, scores and synopses. Sort by countdown or popularity and add shows to your list.`;
};

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
} as const;
