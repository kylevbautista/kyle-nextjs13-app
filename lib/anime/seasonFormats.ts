/**
 * The season page's format filter (components/animev3/PageBase.tsx): which
 * AniList format each show is, the counts on the format chips, and the
 * filter itself. Pure, so the page's counts and status lines can be tested.
 * The chips' strings live in seasonCopy.ts; their labels are the cards' own
 * (lib/landing.ts#formatLabel), so a chip always says what a card's pill says.
 */
import type { AnimeMedia } from "./types";

/** AniList's anime formats in its own order, then OTHER: no format, or one this code doesn't know. */
export const FORMAT_KEYS = ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC", "OTHER"] as const;
export type FormatKey = (typeof FORMAT_KEYS)[number];

/** The seven AniList anime formats: always a chip, in this order (zero counts included). */
export const ANILIST_FORMATS = FORMAT_KEYS.filter((key) => key !== "OTHER");

const KNOWN = new Set<string>(ANILIST_FORMATS);

export const formatKeyOf = (media: Pick<AnimeMedia, "format">): FormatKey =>
  media.format && KNOWN.has(media.format) ? (media.format as FormatKey) : "OTHER";

export type FormatCounts = Record<FormatKey, number>;

export function formatCounts(media: readonly Pick<AnimeMedia, "format">[]): FormatCounts {
  const counts = Object.fromEntries(FORMAT_KEYS.map((key) => [key, 0])) as FormatCounts;
  for (const item of media) counts[formatKeyOf(item)] += 1;
  return counts;
}

/**
 * The chips to show: AniList's seven formats always (so none appears or
 * vanishes while pages load or under a press), then Other once a loaded show
 * needs it, or while it's hidden (so it can be shown again).
 */
export function chipFormats(counts: FormatCounts, hidden: readonly FormatKey[]): FormatKey[] {
  return counts.OTHER > 0 || hidden.includes("OTHER") ? [...FORMAT_KEYS] : [...ANILIST_FORMATS];
}

/** The list without shows in hidden formats; the same array when nothing is hidden. */
export function filterByFormat<T extends Pick<AnimeMedia, "format">>(list: readonly T[], hidden: readonly FormatKey[]): readonly T[] {
  if (!hidden.length) return list;
  const set = new Set(hidden);
  return list.filter((item) => !set.has(formatKeyOf(item)));
}

/** A hidden set in canonical order (FORMAT_KEYS), so equal sets compare and serialize equal. */
export const canonicalFormats = (keys: Iterable<FormatKey>): FormatKey[] => {
  const set = new Set(keys);
  return FORMAT_KEYS.filter((key) => set.has(key));
};

/** The hidden formats that hold loaded shows, in chip order (what the end card names). */
export const hiddenWithShows = (counts: FormatCounts, hidden: readonly FormatKey[]): FormatKey[] =>
  canonicalFormats(hidden).filter((key) => counts[key] > 0);

/** Toggles one format in a hidden set (canonical order). */
export const toggleFormat = (hidden: readonly FormatKey[], key: FormatKey): FormatKey[] =>
  hidden.includes(key) ? hidden.filter((item) => item !== key) : canonicalFormats([...hidden, key]);
