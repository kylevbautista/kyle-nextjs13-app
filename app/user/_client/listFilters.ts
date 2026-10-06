/**
 * Pure filtering / sorting / grouping for the My List page. Everything here
 * runs during render on both the server and the client, so it must be
 * deterministic (no clock, no locale-dependent collation).
 */
import { isSeasonName, type SeasonName } from "@/lib/season";
import { WEEKDAYS, airingWeekday, compareByNextAiring, unloggedAired } from "@/lib/anime/airing";
import type { AiringFields, Weekday } from "@/lib/anime/airing";
import { LIST_STATUSES, displayTitle } from "@/lib/anime/types";
import type { ListEntry, ListStatus, UserAnimeData } from "@/lib/anime/types";
import { isReleaseStatus, type ReleaseStatus } from "@/lib/anime/releaseStatus";

/**
 * The fields of a list entry this page renders. Entries are trimmed to this
 * on the server (descriptions, links, genres… are never shown here), which
 * keeps the RSC payload small.
 */
export type MyListEntry = Pick<
  ListEntry,
  | "id"
  | "title"
  | "coverImage"
  | "season"
  | "seasonYear"
  | "format"
  | "status"
  | "episodes"
  | "duration"
  | "startDate"
  | "upcomingEpisode"
  | "upComingAirDate"
  | "firstEpisode"
  | "userData"
>;

export const toMyListEntry = (entry: ListEntry): MyListEntry => ({
  id: entry.id,
  title: entry.title,
  coverImage: entry.coverImage,
  season: entry.season,
  seasonYear: entry.seasonYear ?? null,
  format: entry.format ?? null,
  status: entry.status,
  episodes: entry.episodes,
  duration: entry.duration ?? null,
  startDate: entry.startDate,
  upcomingEpisode: entry.upcomingEpisode,
  upComingAirDate: entry.upComingAirDate,
  firstEpisode: entry.firstEpisode,
  userData: entry.userData,
});

export type StatusTab = "all" | ListStatus;

export {
  RELEASE_STATUSES,
  RELEASE_STATUS_LABELS,
  isReleaseStatus,
  type ReleaseStatus,
} from "@/lib/anime/releaseStatus";

export const isWeekday = (value: unknown): value is Weekday =>
  typeof value === "string" && (WEEKDAYS as readonly string[]).includes(value);

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export interface ListFilters {
  query: string;
  year: number | null;
  season: SeasonName | null;
  weekday: Weekday | null;
  release: ReleaseStatus | null;
}

export const EMPTY_FILTERS: ListFilters = {
  query: "",
  year: null,
  season: null,
  weekday: null,
  release: null,
};

export const hasActiveFilters = (filters: ListFilters) =>
  filters.query.trim() !== "" ||
  filters.year !== null ||
  filters.season !== null ||
  filters.weekday !== null ||
  filters.release !== null;

/**
 * The year a show belongs to. `seasonYear` comes first so the year and season
 * filters agree (a show premiering in late December is listed by AniList
 * under the next year's winter season).
 */
export const entryYear = (entry: Pick<MyListEntry, "seasonYear" | "startDate">) =>
  entry.seasonYear ?? entry.startDate?.year ?? null;

/** Distinct years present in the list, newest first. */
export function yearOptions(entries: MyListEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    const year = entryYear(entry);
    if (year !== null) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

const foldText = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

export function matchesFilters(entry: MyListEntry, filters: ListFilters): boolean {
  const query = foldText(filters.query.trim());
  if (query) {
    const { romaji, english, native } = entry.title ?? {};
    const hit = [romaji, english, native].some(
      (title) => typeof title === "string" && foldText(title).includes(query)
    );
    if (!hit) return false;
  }
  if (filters.year !== null && entryYear(entry) !== filters.year) return false;
  if (filters.season !== null && entry.season?.toLowerCase() !== filters.season) return false;
  if (filters.weekday !== null && airingWeekday(entry) !== filters.weekday) return false;
  if (filters.release !== null && entry.status !== filters.release) return false;
  return true;
}

export type SortKey = "next" | "new" | "title" | "score" | "progress" | "added";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "next", label: "Next episode" },
  { value: "new", label: "New episodes" },
  { value: "title", label: "Title A–Z" },
  { value: "score", label: "My score" },
  { value: "progress", label: "Progress" },
  { value: "added", label: "Recently added" },
];

export const isSortKey = (value: unknown): value is SortKey =>
  SORT_OPTIONS.some((option) => option.value === value);

// A fixed locale keeps server and client orderings identical.
const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const byTitle = (a: MyListEntry, b: MyListEntry) =>
  collator.compare(displayTitle(a), displayTitle(b));

/** Null-last descending comparison of two optional numbers. */
const descNullsLast = (a: number | null, b: number | null) => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
};

/** Share of known episodes watched (0–1), or null when the count is unknown. */
export const progressRatio = (entry: MyListEntry) =>
  entry.episodes && entry.episodes > 0
    ? Math.min(1, entry.userData.episodeProgressNumber / entry.episodes)
    : null;

/**
 * Returns a sorted copy. `entries` must be in stored (add) order, which is
 * what "Recently added" reverses.
 */
export function sortEntries(
  entries: MyListEntry[],
  sort: SortKey,
  /** For "new": the reference time (the server's render time), so server and client agree. */
  nowMs: number | null = null
): MyListEntry[] {
  switch (sort) {
    case "added":
      return [...entries].reverse();
    case "title":
      return [...entries].sort(byTitle);
    case "score":
      return [...entries].sort(
        (a, b) => descNullsLast(a.userData.score, b.userData.score) || byTitle(a, b)
      );
    case "progress":
      return [...entries].sort(
        (a, b) => descNullsLast(progressRatio(a), progressRatio(b)) || byTitle(a, b)
      );
    case "new":
      // Most aired-but-unlogged first, at one fixed reference time.
      return [...entries].sort(
        (a, b) =>
          descNullsLast(unloggedAired(a, nowMs), unloggedAired(b, nowMs)) ||
          compareByNextAiring(a, b) ||
          byTitle(a, b)
      );
    case "next":
    default:
      return [...entries].sort((a, b) => compareByNextAiring(a, b) || byTitle(a, b));
  }
}

export function countByStatus(entries: MyListEntry[]): Record<StatusTab, number> {
  const counts: Record<StatusTab, number> = {
    all: entries.length,
    watching: 0,
    planning: 0,
    completed: 0,
    paused: 0,
    dropped: 0,
  };
  for (const entry of entries) counts[entry.userData.listType] += 1;
  return counts;
}

export interface ListSection {
  status: ListStatus;
  entries: MyListEntry[];
}

/** Non-empty status sections, in LIST_STATUSES order, preserving entry order. */
export function groupByStatus(entries: MyListEntry[]): ListSection[] {
  return LIST_STATUSES.map((status) => ({
    status,
    entries: entries.filter((entry) => entry.userData.listType === status),
  })).filter((section) => section.entries.length > 0);
}

/** A response's airing fields already equal the entry's (plain stored JSON, compared as such). */
export function sameAiringFields(entry: MyListEntry, fields: Partial<AiringFields>) {
  return (Object.keys(fields) as (keyof AiringFields)[]).every(
    (key) => JSON.stringify(entry[key]) === JSON.stringify(fields[key])
  );
}

/**
 * The cards to render, by section (one section on a status shelf). A held card
 * (one being tapped: +1, catch-up, Undo) is sorted and filed as the entry it
 * was when held (its userData and its airing fields, which a +1's response can
 * update), so it stays where it was while its live values change; the live
 * entry is returned (live values, and the same object for ListCard's memo).
 * With nothing held this is the plain sort + grouping.
 */
export function placeHeld(
  entries: MyListEntry[],
  held: ReadonlyMap<number, MyListEntry>,
  { sort, tab, nowMs }: { sort: SortKey; tab: StatusTab; nowMs: number | null }
): ListSection[] {
  const live = new Map(entries.map((entry) => [entry.id, entry]));
  const placed = held.size ? entries.map((entry) => held.get(entry.id) ?? entry) : entries;
  const sorted = sortEntries(placed, sort, nowMs);
  const sections =
    tab === "all"
      ? groupByStatus(sorted)
      : (() => {
          const inTab = sorted.filter((entry) => entry.userData.listType === tab);
          return inTab.length ? [{ status: tab, entries: inTab }] : [];
        })();
  if (!held.size) return sections;
  return sections.map((section) => ({
    status: section.status,
    entries: section.entries.map((entry) => live.get(entry.id) ?? entry),
  }));
}

/**
 * Episodes watched × AniList's typical episode length, for the banner's
 * "≈ 66 days of runtime". `skipped` counts watched shows with no known length.
 */
export function watchedRuntime(entries: readonly MyListEntry[]): { minutes: number; skipped: number } {
  let minutes = 0;
  let skipped = 0;
  for (const entry of entries) {
    const watched = entry.userData.episodeProgressNumber;
    if (watched <= 0) continue;
    if (entry.duration && entry.duration > 0) minutes += watched * entry.duration;
    else skipped += 1;
  }
  return { minutes, skipped };
}

/** "66 days" / "31 hours" / "45 minutes" (rounded; it's an estimate). */
export function formatRuntime(minutes: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (minutes >= 2 * 24 * 60) return plural(Math.round(minutes / (24 * 60)), "day");
  if (minutes >= 60) return plural(Math.round(minutes / 60), "hour");
  return plural(Math.round(minutes), "minute");
}

// ---------------------------------------------------------------------------
// The view in the URL (?shelf=&sort=&q=&year=&season=&day=&release=)
// ---------------------------------------------------------------------------

export interface ListView {
  tab: StatusTab;
  sort: SortKey;
  filters: ListFilters;
}

export const DEFAULT_VIEW: ListView = { tab: "all", sort: "next", filters: EMPTY_FILTERS };

const MAX_QUERY = 100;
const isStatusTab = (value: unknown): value is StatusTab =>
  value === "all" || (typeof value === "string" && (LIST_STATUSES as readonly string[]).includes(value));

/** Reads a view from the query string; anything unknown or malformed falls back to the default. */
export function parseListView(params: { get(name: string): string | null }): ListView {
  const shelf = params.get("shelf");
  const sort = params.get("sort");
  const year = Number(params.get("year"));
  const season = params.get("season");
  const day = params.get("day");
  const release = params.get("release");
  return {
    tab: isStatusTab(shelf) ? shelf : "all",
    sort: isSortKey(sort) ? sort : "next",
    filters: {
      query: Array.from(params.get("q") ?? "").slice(0, MAX_QUERY).join(""),
      year: Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null,
      season: isSeasonName(season) ? season : null,
      weekday: isWeekday(day) ? day : null,
      release: isReleaseStatus(release) ? release : null,
    },
  };
}

/** The query string for a view ("" for the default), defaults omitted. */
export function listViewQuery({ tab, sort, filters }: ListView): string {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("shelf", tab);
  if (sort !== "next") params.set("sort", sort);
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.year !== null) params.set("year", String(filters.year));
  if (filters.season) params.set("season", filters.season);
  if (filters.weekday) params.set("day", filters.weekday);
  if (filters.release) params.set("release", filters.release);
  const query = params.toString();
  return query ? `?${query}` : "";
}
