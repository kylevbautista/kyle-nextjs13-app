/**
 * Whitelisting + coercion for anything that becomes (or comes out of) a
 * `users.following[]` entry. Clients send whole AniList media objects, and
 * list pages are public, so nothing client-supplied is stored as-is.
 */
import { DISPLAY_TIME_ZONE } from "./airing";
import { sanitizeDescription } from "./sanitize";
import {
  AnimeAiring,
  AnimeMedia,
  DEFAULT_USER_DATA,
  ListEntry,
  ListStatus,
  UserAnimeData,
  isListStatus,
} from "./types";

type Obj = Record<string, unknown>;

const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const obj = (value: unknown): Obj => (isObj(value) ? value : {});

const num = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const int = (value: unknown): number | null => {
  const parsed = num(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
};

const str = (value: unknown, max = 300): string | null =>
  typeof value === "string" ? value.slice(0, max) : null;

const httpUrl = (value: unknown): string | null => {
  const raw = str(value, 2000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

/** Cover images are only loaded from AniList's CDN (no third-party tracking pixels). */
const ANILIST_IMAGE_HOSTS = [/(^|\.)anilist\.co$/i, /(^|\.)anili\.st$/i];
const anilistImageUrl = (value: unknown): string | null => {
  const url = httpUrl(value);
  if (!url) return null;
  const { hostname, protocol } = new URL(url);
  return protocol === "https:" && ANILIST_IMAGE_HOSTS.some((re) => re.test(hostname))
    ? url
    : null;
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const list = <T>(value: unknown, max: number, map: (item: unknown) => T | null): T[] =>
  Array.isArray(value)
    ? value.slice(0, max).map(map).filter((item): item is T => item !== null)
    : [];

/** An integer within [min, max], else null. */
const intInRange = (value: unknown, min: number, max: number): number | null => {
  const parsed = int(value);
  return parsed !== null && parsed >= min && parsed <= max ? parsed : null;
};

// Unix seconds between 1900 and 2200: anything else would make Date formatting throw.
const MIN_UNIX_SECONDS = Date.UTC(1900, 0, 1) / 1000;
const MAX_UNIX_SECONDS = Date.UTC(2200, 0, 1) / 1000;

const airing = (value: unknown, withTimeUntil: boolean): AnimeAiring | null => {
  if (!isObj(value)) return null;
  const node: AnimeAiring = {
    airingAt: intInRange(value.airingAt, MIN_UNIX_SECONDS, MAX_UNIX_SECONDS),
    episode: int(value.episode),
  };
  if (withTimeUntil) node.timeUntilAiring = int(value.timeUntilAiring);
  return node;
};

export const MEDIA_SNAPSHOT_FIELDS = [
  "idMal",
  "title",
  "description",
  "coverImage",
  "season",
  "seasonYear",
  "format",
  "status",
  "episodes",
  "duration",
  "source",
  "genres",
  "averageScore",
  "popularity",
  "studios",
  "startDate",
  "externalLinks",
  "upcomingEpisode",
  "upComingAirDate",
  "firstEpisode",
] as const satisfies readonly (keyof AnimeMedia)[];

/**
 * Coerces an AniList media object (from AniList, a client request, or Mongo)
 * into a safe AnimeMedia. Returns null when there is no positive integer id.
 */
export function normalizeMedia(input: unknown): AnimeMedia | null {
  if (!isObj(input)) return null;
  const id = int(input.id);
  if (id === null || id <= 0) return null;

  const title = obj(input.title);
  const cover = obj(input.coverImage);
  const startDate = obj(input.startDate);
  const upcoming = isObj(input.upcomingEpisode) ? input.upcomingEpisode : null;
  const color = str(cover.color, 16);

  return {
    id,
    idMal: int(input.idMal),
    title: {
      romaji: str(title.romaji, 500),
      english: str(title.english, 500),
      native: str(title.native, 500),
    },
    description: sanitizeDescription(input.description),
    coverImage: {
      extraLarge: anilistImageUrl(cover.extraLarge),
      large: anilistImageUrl(cover.large),
      medium: anilistImageUrl(cover.medium),
      color: color && HEX_COLOR_RE.test(color) ? color : null,
    },
    season: str(input.season, 20),
    seasonYear: int(input.seasonYear),
    format: str(input.format, 30),
    status: str(input.status, 30),
    episodes: int(input.episodes),
    duration: int(input.duration),
    source: str(input.source, 50),
    genres: list(input.genres, 30, (genre) => str(genre, 60)),
    averageScore: num(input.averageScore),
    popularity: int(input.popularity),
    studios: {
      nodes: list(obj(input.studios).nodes, 20, (node) =>
        isObj(node) ? { name: str(node.name, 200) } : null
      ),
    },
    startDate: {
      year: intInRange(startDate.year, 1900, 2200),
      month: intInRange(startDate.month, 1, 12),
      day: intInRange(startDate.day, 1, 31),
    },
    externalLinks: list(input.externalLinks, 50, (link) =>
      isObj(link) ? { id: int(link.id), url: httpUrl(link.url), site: str(link.site, 100) } : null
    ),
    upcomingEpisode: upcoming
      ? {
          id: int(upcoming.id),
          episode: int(upcoming.episode),
          timeUntilAiring: int(upcoming.timeUntilAiring),
          mediaId: int(upcoming.mediaId),
        }
      : null,
    upComingAirDate: {
      episode: list(obj(input.upComingAirDate).episode, 1, (node) => airing(node, true)),
    },
    firstEpisode: {
      episode: list(obj(input.firstEpisode).episode, 1, (node) => airing(node, false)),
    },
  };
}

/** Reads a stored list entry (legacy entries may lack userData or fields). */
export function normalizeEntry(input: unknown): ListEntry | null {
  const media = normalizeMedia(input);
  if (!media) return null;
  const stored = obj(obj(input).userData);
  return {
    ...media,
    userData: {
      listType: isListStatus(stored.listType) ? stored.listType : DEFAULT_USER_DATA.listType,
      episodeProgressNumber: Math.max(0, int(stored.episodeProgressNumber) ?? 0),
      startDate: num(stored.startDate),
      finishDate: num(stored.finishDate),
      score: num(stored.score),
    },
  };
}

const calendarDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day of `ms` in DISPLAY_TIME_ZONE, as epoch ms at UTC midnight. */
export const calendarDayMs = (ms: number) => {
  const [year, month, day] = calendarDayFormat.format(new Date(ms)).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const MIN_DATE_MS = Date.UTC(1900, 0, 1);
const MAX_DATE_MS = Date.UTC(2200, 0, 1);
const MAX_EPISODES = 100_000;

export type UserDataResult =
  | { ok: true; value: UserAnimeData }
  | { ok: false; error: string };

/**
 * Validates a client-sent userData object and applies tracker rules:
 * - progress is clamped to the known episode count
 * - logging progress without a status (a +1) on a Plan to Watch or Paused show
 *   moves it to Watching, as AniList and MyAnimeList do; an explicit status
 *   (the edit dialog always sends one) is never overridden
 * - watching/planning → completed when progress reaches the last episode
 * - completed → progress filled to the episode count
 * - startDate set when progress first moves off 0; finishDate set on completion
 */
export function normalizeUserData(
  input: unknown,
  {
    episodes,
    previous = DEFAULT_USER_DATA,
    now = Date.now(),
  }: { episodes: number | null; previous?: UserAnimeData; now?: number }
): UserDataResult {
  if (!isObj(input)) return { ok: false, error: "userData must be an object" };

  let listType: ListStatus = previous.listType;
  if (input.listType !== undefined) {
    if (!isListStatus(input.listType)) return { ok: false, error: "Invalid list status" };
    listType = input.listType;
  }

  let progress = previous.episodeProgressNumber;
  if (input.episodeProgressNumber !== undefined) {
    const parsed = int(input.episodeProgressNumber);
    if (parsed === null || parsed < 0 || parsed > MAX_EPISODES) {
      return { ok: false, error: "Episode progress must be a whole number of 0 or more" };
    }
    progress = parsed;
  }

  let score = previous.score;
  if (input.score !== undefined) {
    if (input.score === null || input.score === "") {
      score = null;
    } else {
      const parsed = num(input.score);
      if (parsed === null || parsed < 0 || parsed > 10) {
        return { ok: false, error: "Score must be between 0 and 10" };
      }
      score = Math.round(parsed * 10) / 10;
    }
  }

  const date = (key: "startDate" | "finishDate"): number | null | "invalid" => {
    const value = input[key];
    if (value === undefined) return previous[key];
    if (value === null || value === "") return null;
    const parsed = num(value);
    return parsed !== null && parsed >= MIN_DATE_MS && parsed <= MAX_DATE_MS ? parsed : "invalid";
  };
  let startDate = date("startDate");
  let finishDate = date("finishDate");
  if (startDate === "invalid" || finishDate === "invalid") {
    return { ok: false, error: "Dates must be valid" };
  }

  const total = episodes && episodes > 0 ? episodes : null;
  // Only an explicit status choice counts as a change (the implicit move below doesn't).
  const statusChanged = input.listType !== undefined && listType !== previous.listType;
  if (total !== null && progress > total) progress = total;
  // A +1 (progress, no status) starts a planned show or resumes a paused one. Runs
  // before auto-complete, so a +1 to the finale still lands on Completed.
  if (
    input.listType === undefined &&
    progress > previous.episodeProgressNumber &&
    (listType === "planning" || listType === "paused")
  ) {
    listType = "watching";
  }
  // Auto-complete only when progress *reaches* the last episode; an explicit
  // move back to Watching/Plan to Watch (e.g. a rewatch) is respected.
  if (
    total !== null &&
    progress === total &&
    previous.episodeProgressNumber < total &&
    !statusChanged &&
    (listType === "watching" || listType === "planning")
  ) {
    listType = "completed";
  }
  if (listType === "completed" && total !== null && previous.listType !== "completed") {
    progress = total;
  }
  // Auto-filled dates are calendar days: today in DISPLAY_TIME_ZONE, stored as
  // UTC midnight like the dates the edit dialog saves.
  const today = calendarDayMs(now);
  if (startDate === null && progress > 0 && previous.episodeProgressNumber === 0) {
    startDate = today;
  }
  if (finishDate === null && listType === "completed" && previous.listType !== "completed") {
    finishDate = today;
  }

  return {
    ok: true,
    value: { listType, episodeProgressNumber: progress, startDate, finishDate, score },
  };
}
