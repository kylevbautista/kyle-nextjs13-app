/**
 * The link-preview cards of /user/<id> and /mylist/<id> (CLAUDE.md §5.8): everything the share images draw,
 * computed from stored list entries only (no clock, no AniList), and the version that keys their URLs. The
 * page's generateMetadata and the image route call these on equal entries, so they agree on `v`
 * (server/lib/userList.test.ts checks that CARD_PROJECTION covers every field read here). Server-only callers.
 */
import { DAY_LABELS, SCHEDULE_DAYS, buildSchedule } from "@/components/mylist/schedule";
import type { Weekday } from "@/lib/anime/airing";
import {
  FINAL_FORM_LINE,
  TIER_LABELS,
  evolutionProgress,
  evolutionRemainingLine,
  evolutionTier,
  showsLabel,
  type EvolutionTier,
} from "@/lib/landing";
import {
  LIST_EMPTY_TITLE,
  LIST_STAT_LABELS,
  listEmptyBody,
  listOf,
  listStats,
  listTitle,
  listVisitorLine,
  listVisitorSub,
  noAnimeYetTitle,
  nothingScheduledTitle,
  scheduleStandingLine,
  scheduleSub,
  scheduleTitle,
  type ListStats,
} from "@/lib/anime/listCopy";
import type { ListEntry } from "@/lib/anime/types";

/** Bump when the images' design changes: every preview URL changes (unfurlers cache by URL, X for 7 days). */
export const SHARE_FORMAT = 1;
/** A share-image URL's version segment: 7 base36 characters (FNV-1a 32-bit, zero-padded). */
export const SHARE_VERSION_RE = /^[0-9a-z]{7}$/;
/** The h1's box in each image (components/og). */
export const LIST_TITLE_WIDTH = 680;
export const SCHEDULE_TITLE_WIDTH = 1000;
export const TITLE_SIZES = [84, 68, 56] as const;
export type TitleSize = (typeof TITLE_SIZES)[number];
const SMALLEST_TITLE: TitleSize = 56;
/** Safety margin over the measured advance widths (the text stroke, kerning). */
const TITLE_SLACK = 1.04;
const NAME_MAX_GRAPHEMES = 24;

/**
 * Advance widths of assets/og/Geist-Regular.ttf for ASCII 0x20–0x7E, in 1/1000 em (its unitsPerEm is 1000).
 * Measured from the font's hmtx table; regenerate if the font file changes.
 */
const GEIST_ADVANCE = [
  250, 213, 346, 478, 629, 802, 620, 178, 274, 274, 430, 558, 201, 419, 201, 480, 663, 384, 619, 613, 615, 626, 593,
  524, 604, 593, 297, 297, 544, 540, 544, 559, 906, 668, 680, 703, 694, 603, 590, 700, 713, 270, 597, 640, 580, 877,
  743, 739, 650, 733, 672, 640, 552, 689, 667, 945, 606, 576, 544, 347, 455, 347, 426, 557, 248, 551, 595, 546, 595,
  561, 395, 594, 581, 244, 260, 590, 267, 877, 581, 573, 595, 595, 379, 520, 392, 575, 536, 819, 585, 537, 537, 389,
  264, 389, 523,
];
/** Full-width graphemes: CJK, kana, Hangul, full-width forms, emoji. */
const WIDE =
  /^(?:[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]|\p{Extended_Pictographic})/u;
/**
 * Invisible format characters a name may carry: the bidi controls (LRM, RLM, LRE…RLO, LRI…PDI), the Arabic letter
 * mark and the zero-width space. Written as escapes: a raw RLO can visually reorder source code ("Trojan Source").
 * Never strip U+200C/U+200D (ZWNJ/ZWJ): emoji sequences and some scripts need them.
 */
const INVISIBLE_FORMAT = /[\u061C\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
/** Scripts Satori draws unshaped or in the wrong order (no bidi, no complex shaping). */
const UNSHAPED_SCRIPTS =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Thai}\p{Script=Lao}\p{Script=Tibetan}\p{Script=Myanmar}\p{Script=Khmer}]/u;

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
export const graphemes = (text: string) => Array.from(segmenter.segment(text), (part) => part.segment);

/** Estimated width of `text` in Geist Regular, in em (exact for ASCII, conservative otherwise). */
export function textWidthEm(text: string): number {
  let em = 0;
  for (const grapheme of graphemes(text)) {
    const code = grapheme.codePointAt(0) ?? 0;
    if (grapheme.length === 1 && code >= 0x20 && code <= 0x7e) em += GEIST_ADVANCE[code - 0x20] / 1000;
    else if (WIDE.test(grapheme)) em += 1;
    else if (code >= 0xa0 && code <= 0x24f) em += 0.62; // Latin-1 + Latin Extended (Geist averages 0.58)
    else em += 0.7;
  }
  return em;
}

/** Emoji: @vercel/og fetches them from twemoji 14 at render time, and newer ones come back blank. */
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/**
 * The name as an image may draw it: invisible format characters stripped,
 * NFKC-normalized ("fancy text" like 𝓚𝔂𝓵𝓮 or ＫＹＬＥ back to plain letters
 * Geist draws), emoji dropped, ≤ 24 graphemes; null for scripts Satori can't
 * shape, or when nothing drawable is left.
 */
export function drawableName(name: string): string | null {
  const normalized = name.replace(INVISIBLE_FORMAT, "").normalize("NFKC");
  const clean = graphemes(normalized)
    .filter((grapheme) => !EMOJI.test(grapheme))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || UNSHAPED_SCRIPTS.test(clean)) return null;
  const parts = graphemes(clean);
  return parts.length > NAME_MAX_GRAPHEMES ? `${parts.slice(0, NAME_MAX_GRAPHEMES - 1).join("")}…` : clean;
}

export interface ShareTitle {
  /** The name every line of this image uses (possibly clipped with "…"); null = neutral wording. */
  name: string | null;
  text: string;
  size: TitleSize;
}

/** The largest h1 size whose text fits `maxWidth`; past 56px the name is clipped with "…" until it fits. */
export function fitTitle(
  name: string | null,
  titleFor: (name: string | null) => string,
  maxWidth: number
): ShareTitle {
  const fits = (text: string, size: number) => textWidthEm(text) * size * TITLE_SLACK <= maxWidth;
  for (const size of TITLE_SIZES) {
    if (fits(titleFor(name), size)) return { name, text: titleFor(name), size };
  }
  if (name === null) return { name, text: titleFor(null), size: SMALLEST_TITLE };
  const parts = graphemes(name);
  for (let keep = parts.length - 1; keep >= 1; keep--) {
    const clipped = `${parts.slice(0, keep).join("").trimEnd()}…`;
    if (fits(titleFor(clipped), SMALLEST_TITLE)) return { name: clipped, text: titleFor(clipped), size: SMALLEST_TITLE };
  }
  const clipped = `${parts[0]}…`;
  return { name: clipped, text: titleFor(clipped), size: SMALLEST_TITLE };
}

export interface ListShareCard {
  kind: "list";
  title: ShareTitle;
  sage: { kind: "Report"; text: string };
  sub: string;
  /** Shows, Watching, Episodes seen, Mean score; null for an empty list (the panel replaces the grid). */
  stats: { label: string; value: string }[] | null;
  empty: { title: string; body: string } | null;
  evolution: {
    tier: EvolutionTier;
    form: string;
    count: string;
    progress: { ratio: number; line: string } | null;
    final: string | null;
  };
  alt: string;
}

export interface ScheduleShareCard {
  kind: "schedule";
  title: ShareTitle;
  sage: { kind: "Notice"; text: string };
  sub: string;
  /** All + Mon…Sun; null when nothing airs (the panel title replaces the strip). */
  tabs: { label: string; count: number; selected: boolean }[] | null;
  empty: string | null;
  tier: EvolutionTier;
  alt: string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** og:image:alt for image A. The full first name (the platform shapes any script), not the drawn one. */
export function listShareAlt(ownerName: string, stats: ListStats, tier: EvolutionTier): string {
  const lead = `${ownerName}'s anime list on kylevb:`;
  const form = `Current form: ${TIER_LABELS[tier]}.`;
  if (!stats.shows) return `${lead} no shows yet. ${form}`;
  return (
    `${lead} ${showsLabel(stats.shows)}, ${stats.watching} watching, ` +
    `${plural(stats.episodes, "episode", "episodes")} seen, ` +
    `${stats.meanScore ? `mean score ${stats.meanScore}` : "no scores yet"}. ${form}`
  );
}

/** og:image:alt for image B: every drawn count, days with none left out. */
export function scheduleShareAlt(
  ownerName: string,
  counts: { day: Weekday; count: number }[],
  airing: number,
  hasEntries: boolean
): string {
  const lead = `${ownerName}'s airing schedule on kylevb:`;
  if (airing) {
    const days = counts.filter(({ count }) => count > 0).map(({ day, count }) => `${DAY_LABELS[day].long} ${count}`);
    return `${lead} ${showsLabel(airing)} with an upcoming episode. By weekday in Pacific Time: ${days.join(", ")}.`;
  }
  return hasEntries
    ? `${lead} nothing on ${ownerName}'s airing schedule.`
    : `${lead} ${ownerName} hasn't added any anime yet.`;
}

/** Image A's view model. `ownerName` = publicOwnerName() ?? "Anonymous" (what both pages call the owner). */
export function listShareCard(
  entries: readonly ListEntry[],
  ownerName: string,
  { neutral = false }: { neutral?: boolean } = {}
): ListShareCard {
  const stats = listStats(entries);
  const title = fitTitle(neutral ? null : drawableName(ownerName), listTitle, LIST_TITLE_WIDTH);
  const name = title.name;
  const tier = evolutionTier(true, stats.shows);
  const progress = evolutionProgress(tier, stats.shows);
  return {
    kind: "list",
    title,
    sage: listVisitorLine(name, stats),
    sub: listVisitorSub(name),
    stats: stats.shows
      ? [
          { label: LIST_STAT_LABELS.shows, value: String(stats.shows) },
          { label: LIST_STAT_LABELS.watching, value: String(stats.watching) },
          { label: LIST_STAT_LABELS.episodes, value: String(stats.episodes) },
          { label: LIST_STAT_LABELS.meanScore, value: stats.meanScore ?? "—" },
        ]
      : null,
    empty: stats.shows ? null : { title: LIST_EMPTY_TITLE, body: listEmptyBody(name) },
    evolution: {
      tier,
      form: TIER_LABELS[tier],
      count: `${showsLabel(stats.shows)} on ${listOf(name)}`,
      progress: progress && { ratio: Math.round(progress.ratio * 1000) / 1000, line: evolutionRemainingLine(progress) },
      final: progress ? null : FINAL_FORM_LINE,
    },
    alt: listShareAlt(ownerName, stats, tier),
  };
}

/** Image B's view model. Weekdays in Pacific Time from the stored next airing (buildSchedule: no clock). */
export function scheduleShareCard(
  entries: readonly ListEntry[],
  ownerName: string,
  { neutral = false }: { neutral?: boolean } = {}
): ScheduleShareCard {
  const schedule = buildSchedule(entries);
  const title = fitTitle(neutral ? null : drawableName(ownerName), scheduleTitle, SCHEDULE_TITLE_WIDTH);
  const name = title.name;
  const airing = schedule.airingCount;
  const counts = SCHEDULE_DAYS.map((day) => ({ day, count: schedule.days[day].length }));
  return {
    kind: "schedule",
    title,
    sage: { kind: "Notice", text: scheduleStandingLine(name ? `${name}'s` : "this list's") },
    sub: scheduleSub(airing),
    tabs: airing
      ? [
          { label: "All", count: airing, selected: true },
          ...counts.map(({ day, count }) => ({ label: DAY_LABELS[day].short, count, selected: false })),
        ]
      : null,
    empty: airing ? null : entries.length ? nothingScheduledTitle(name) : noAnimeYetTitle(name),
    tier: evolutionTier(true, entries.length),
    alt: scheduleShareAlt(ownerName, counts, airing, entries.length > 0),
  };
}

/** FNV-1a 32-bit over the UTF-8 JSON of [format, card], base36, 7 characters: same card → same URL. */
export function shareVersion(card: ListShareCard | ScheduleShareCard, format: number = SHARE_FORMAT): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(JSON.stringify([format, card]))) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}
