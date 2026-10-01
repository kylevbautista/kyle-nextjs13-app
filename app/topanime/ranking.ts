/**
 * Pure helpers for /topanime: the Octagram split, ranges, the #1's lead, the
 * banner's glance facts and every sentence the page builds from data. No
 * React, no clock: server and browser produce identical text.
 *
 * MyAnimeList's own ranking has one show per rank. Jikan refreshes each show
 * separately, so its copy can repeat or skip a rank for a while: never call
 * a repeated rank a "tie".
 */
import type { TopAnimeItem } from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import { formatAirDate } from "@/lib/anime/airing";

/** Ranks 1–8 are "the Octagram" (Tensura's eight Demon Lords). */
export const OCTAGRAM_RANK = 8;

export const isOctagram = (item: TopAnimeItem) => item.rank !== null && item.rank <= OCTAGRAM_RANK;

/** Octagram rows and the rest, each in loaded order. */
export function splitOctagram(items: readonly TopAnimeItem[]) {
  const octagram: TopAnimeItem[] = [];
  const rest: TopAnimeItem[] = [];
  for (const item of items) (isOctagram(item) ? octagram : rest).push(item);
  return { octagram, rest };
}

export interface RankRange {
  min: number;
  max: number;
}

/** Lowest and highest rank among `items` (unranked ignored), or null. */
export function rankRange(items: readonly TopAnimeItem[]): RankRange | null {
  let range: RankRange | null = null;
  for (const { rank } of items) {
    if (rank === null) continue;
    range = range ? { min: Math.min(range.min, rank), max: Math.max(range.max, rank) } : { min: rank, max: rank };
  }
  return range;
}

/** "#9–#25" / "#9" */
export const rangeText = ({ min, max }: RankRange) => (min === max ? `#${min}` : `#${min}–#${max}`);
/** "ranks 9 to 25" / "rank 9" */
export const rangeSpoken = ({ min, max }: RankRange) =>
  min === max ? `rank ${min}` : `ranks ${min} to ${max}`;

export const displayName = (item: TopAnimeItem) => item.titleEnglish ?? item.title;

/** The default (usually romaji) title, when it differs from the English one shown. */
export const altTitle = (item: TopAnimeItem) =>
  item.titleEnglish !== null && item.titleEnglish !== item.title ? item.title : null;

/** 1_234_567 → "1.2M". Hand-rolled so server and browser output always match. */
export const compactNumber = (n: number) => {
  const oneDecimal = (value: number) => value.toFixed(1).replace(/\.0$/, "");
  if (n >= 999_950) return `${oneDecimal(n / 1_000_000)}M`;
  if (n >= 1_000) return `${oneDecimal(n / 1_000)}K`;
  return String(n);
};

/** 1479110 → "1,479,110" (no locale lookup, for the same reason). */
export const exactNumber = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** "1 show" / "1,250 shows" */
export const countLabel = (n: number) => `${exactNumber(n)} ${n === 1 ? "show" : "shows"}`;

/** "TV · 28 eps · 2023" */
export const detailsLine = (item: TopAnimeItem) =>
  [
    item.type,
    item.episodes !== null ? `${item.episodes} ${item.episodes === 1 ? "ep" : "eps"}` : null,
    item.year !== null ? String(item.year) : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** Screen-reader prefix of a row's heading: "Rank 1" / "Unranked". */
export const rankLabel = (item: TopAnimeItem) => (item.rank === null ? "Unranked" : `Rank ${item.rank}`);

/** The rail numeral shrinks with its digit count so long ranks never hit the poster. */
export function rankSizeClass(rank: number) {
  const digits = String(rank).length;
  if (digits <= 2) return "text-[1.75rem] sm:text-4xl lg:text-5xl";
  if (digits === 3) return "text-[1.375rem] sm:text-2xl lg:text-4xl";
  if (digits === 4) return "text-base sm:text-xl lg:text-3xl";
  return "text-sm sm:text-lg lg:text-2xl";
}

/** The first show ranked #1, if any. */
export const crownOf = (items: readonly TopAnimeItem[]) => items.find((item) => item.rank === 1) ?? null;

export interface CrownLead {
  runnerUpRank: number;
  /** Score difference, rounded to MyAnimeList's two decimals (0 = same displayed score). */
  diff: number;
  score: number;
}

/**
 * How far #1 leads the next ranked show. Null when there isn't exactly one
 * #1, either score is missing, or the numbers disagree with the ranks.
 */
export function crownLead(items: readonly TopAnimeItem[]): CrownLead | null {
  const crowns = items.filter((item) => item.rank === 1);
  if (crowns.length !== 1) return null;
  const crown = crowns[0];
  let runnerUp: TopAnimeItem | null = null;
  for (const item of items) {
    if (item.rank === null || item.rank <= 1) continue;
    if (!runnerUp || item.rank < (runnerUp.rank as number)) runnerUp = item;
  }
  if (!runnerUp || runnerUp.rank === null || crown.score === null || runnerUp.score === null) return null;
  const diff = Math.round((crown.score - runnerUp.score) * 100) / 100;
  if (diff < 0) return null;
  return { runnerUpRank: runnerUp.rank, diff, score: crown.score };
}

/** "Leads rank 2 by 0.09 points." / "Same displayed score as rank 2: 9.26." */
export const crownLeadText = ({ runnerUpRank, diff, score }: CrownLead) =>
  diff === 0
    ? `Same displayed score as rank ${runnerUpRank}: ${score.toFixed(2)}.`
    : `Leads rank ${runnerUpRank} by ${diff.toFixed(2)} ${diff === 1 ? "point" : "points"}.`;

export interface GlanceFact {
  label: "Most members" | "Oldest" | "Newest";
  /** Visible value. */
  value: string;
  /** Exact value for screen readers, when the visible one is rounded. */
  spoken: string | null;
  /** "#3 · Fullmetal Alchemist: Brotherhood" */
  note: string;
}

/** Better rank first, unranked last: breaks ties between equal facts. */
const byBestRank = (a: TopAnimeItem, b: TopAnimeItem) =>
  (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);

function pick(
  items: readonly TopAnimeItem[],
  value: (item: TopAnimeItem) => number | null,
  better: (a: number, b: number) => boolean
): TopAnimeItem | null {
  let best: TopAnimeItem | null = null;
  for (const item of items) {
    const v = value(item);
    if (v === null) continue;
    const current = best ? (value(best) as number) : null;
    if (current === null || better(v, current) || (v === current && byBestRank(item, best as TopAnimeItem) < 0)) {
      best = item;
    }
  }
  return best;
}

const factNote = (item: TopAnimeItem) => `${item.rank !== null ? `#${item.rank} · ` : ""}${displayName(item)}`;

/** The banner's "top N at a glance": real facts about the loaded page, each naming its show. */
export function glanceStats(items: readonly TopAnimeItem[]): GlanceFact[] {
  const facts: GlanceFact[] = [];
  const members = pick(items, (item) => item.members, (a, b) => a > b);
  if (members && members.members !== null) {
    facts.push({
      label: "Most members",
      value: compactNumber(members.members),
      spoken: `${exactNumber(members.members)} members`,
      note: factNote(members),
    });
  }
  const oldest = pick(items, (item) => item.year, (a, b) => a < b);
  if (oldest && oldest.year !== null) {
    facts.push({ label: "Oldest", value: String(oldest.year), spoken: null, note: factNote(oldest) });
  }
  const newest = pick(items, (item) => item.year, (a, b) => a > b);
  if (newest && newest.year !== null && newest !== oldest) {
    facts.push({ label: "Newest", value: String(newest.year), spoken: null, note: factNote(newest) });
  }
  return facts;
}

/** The Octagram's explainer, still accurate when Jikan repeats or skips a rank around #8. */
export function octagramBlurb(octagram: readonly TopAnimeItem[]) {
  const lead = "In Tensura, the Octagram are the eight Demon Lords.";
  return octagram.length === OCTAGRAM_RANK
    ? `${lead} Here, they're MyAnimeList's top eight.`
    : `${lead} Here, they're the ${countLabel(octagram.length)} ranked 1–8 in Jikan's copy of MyAnimeList's ranking, which can repeat or skip a rank.`;
}

/** The Great Sage console's line under the ranking. */
export function consoleLine({
  items,
  loading,
  lastPage,
  hasNextPage,
}: {
  items: readonly TopAnimeItem[];
  loading: boolean;
  lastPage: number;
  hasNextPage: boolean;
}) {
  const range = rankRange(items);
  if (loading) {
    return range ? `Asking Jikan for the ranks after #${range.max}…` : "Asking Jikan for the next page of the ranking…";
  }
  if (!hasNextPage) {
    // The joke only once the reader has actually loaded more.
    return `That's the whole ranking: ${countLabel(items.length)} loaded.${lastPage > 1 ? " Impressive scrolling." : ""}`;
  }
  return range
    ? `${countLabel(items.length)} loaded: ${rangeSpoken(range)}.`
    : `${countLabel(items.length)} loaded.`;
}

/** The screen-reader status after a "Show more". */
export function loadedAnnouncement(added: readonly TopAnimeItem[], total: number, end: boolean) {
  const tail = `${countLabel(total)} loaded.${end ? " That's the whole ranking." : ""}`;
  if (!added.length) return `That page had no new shows. ${tail}`;
  const range = rankRange(added);
  return `Loaded ${exactNumber(added.length)} more${range ? `, ${rangeSpoken(range)}` : ""}. ${tail}`;
}

/** "Ranking fetched via Jikan, Oct 1, 2026, 3:05 PM PDT." (Pacific, like every time on the site). */
export const fetchedLine = (fetchedAtMs: number) =>
  `Ranking fetched via Jikan, ${formatAirDate(Math.floor(fetchedAtMs / 1000))}.`;

export const malAnimeUrl = (malId: number) => `https://myanimelist.net/anime/${malId}`;
/** MyAnimeList's own ranking, starting after the shows already on screen. */
export const malRankingUrl = (offset: number) => `https://myanimelist.net/topanime.php?limit=${offset}`;
/** The id of a row's title link (focus target after "Show more"). */
export const titleLinkId = (malId: number) => `top-anime-link-${malId}`;
