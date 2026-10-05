/**
 * AniList's release statuses as this app filters by them: My List's "Release
 * status" filter (?release=) and /search's (?release=, the same values).
 */
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
