/**
 * Shapes of AniList media as this app fetches, stores and renders it.
 *
 * The GraphQL aliases in components/utils/anilist-queries/mediaFields.ts
 * (upcomingEpisode, upComingAirDate, firstEpisode) ARE the persistence schema:
 * every `users.following[]` entry is an AnimeMedia snapshot plus `userData`.
 */

export const LIST_STATUSES = [
  "watching",
  "planning",
  "completed",
  "paused",
  "dropped",
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export const LIST_STATUS_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  planning: "Plan to Watch",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
};

export const isListStatus = (value: unknown): value is ListStatus =>
  typeof value === "string" &&
  (LIST_STATUSES as readonly string[]).includes(value);

export interface AnimeTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AnimeCoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}

export interface AnimeExternalLink {
  id: number | null;
  url: string | null;
  site: string | null;
}

export interface AnimeUpcomingEpisode {
  id: number | null;
  episode: number | null;
  timeUntilAiring: number | null;
  mediaId: number | null;
}

export interface AnimeAiring {
  airingAt: number | null;
  timeUntilAiring?: number | null;
  episode: number | null;
}

export interface AnimeMedia {
  /** AniList id — the key for list entries everywhere. */
  id: number;
  idMal: number | null;
  title: AnimeTitle;
  /** Sanitized AniList HTML (only <br>, <i>, <b>, <em>, <strong>). */
  description: string | null;
  coverImage: AnimeCoverImage;
  season: string | null;
  seasonYear?: number | null;
  format?: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  source: string | null;
  genres: string[];
  averageScore: number | null;
  /** Number of AniList users with the show on a list (drives "By Popularity"). */
  popularity?: number | null;
  studios: { nodes: { name: string | null }[] };
  startDate: { year: number | null; month: number | null; day: number | null };
  externalLinks: AnimeExternalLink[];
  /** Alias of AniList `nextAiringEpisode`. */
  upcomingEpisode: AnimeUpcomingEpisode | null;
  /** `airingSchedule(notYetAired: true, perPage: 1)` — next airing. */
  upComingAirDate: { episode: AnimeAiring[] };
  /** `airingSchedule(notYetAired: false, perPage: 1)` — first aired episode. */
  firstEpisode: { episode: AnimeAiring[] };
}

export interface UserAnimeData {
  listType: ListStatus;
  episodeProgressNumber: number;
  /** Epoch milliseconds. */
  startDate: number | null;
  /** Epoch milliseconds. */
  finishDate: number | null;
  /** 0–10, one decimal. */
  score: number | null;
}

export interface ListEntry extends AnimeMedia {
  userData: UserAnimeData;
}

export const DEFAULT_USER_DATA: UserAnimeData = {
  listType: "watching",
  episodeProgressNumber: 0,
  startDate: null,
  finishDate: null,
  score: null,
};

/** Display title: English when AniList has one, else romaji. */
export const displayTitle = (media: Pick<AnimeMedia, "title"> | null | undefined) =>
  media?.title?.english || media?.title?.romaji || media?.title?.native || "Untitled";
