/**
 * Pure filtering / sorting / grouping for the My List page. Everything here
 * runs during render on both the server and the client, so it must be
 * deterministic (no clock, no locale-dependent collation).
 */
import type { SeasonName } from "@/lib/season";
import { WEEKDAYS, airingWeekday, compareByNextAiring } from "@/lib/anime/airing";
import type { Weekday } from "@/lib/anime/airing";
import { LIST_STATUSES, displayTitle } from "@/lib/anime/types";
import type { ListEntry, ListStatus } from "@/lib/anime/types";

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
  startDate: entry.startDate,
  upcomingEpisode: entry.upcomingEpisode,
  upComingAirDate: entry.upComingAirDate,
  firstEpisode: entry.firstEpisode,
  userData: entry.userData,
});

export type StatusTab = "all" | ListStatus;

export const RELEASE_STATUSES = [
  "RELEASING",
  "FINISHED",
  "NOT_YET_RELEASED",
  "HIATUS",
  "CANCELLED",
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  RELEASING: "Airing",
  FINISHED: "Finished",
  NOT_YET_RELEASED: "Not yet aired",
  HIATUS: "On hiatus",
  CANCELLED: "Cancelled",
};

export const isReleaseStatus = (value: unknown): value is ReleaseStatus =>
  typeof value === "string" && (RELEASE_STATUSES as readonly string[]).includes(value);

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

export type SortKey = "next" | "title" | "score" | "progress" | "added";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "next", label: "Next episode" },
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
export function sortEntries(entries: MyListEntry[], sort: SortKey): MyListEntry[] {
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

/** Non-empty status sections, in LIST_STATUSES order, preserving entry order. */
export function groupByStatus(
  entries: MyListEntry[]
): { status: ListStatus; entries: MyListEntry[] }[] {
  return LIST_STATUSES.map((status) => ({
    status,
    entries: entries.filter((entry) => entry.userData.listType === status),
  })).filter((section) => section.entries.length > 0);
}
