import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";

/**
 * MyAnimeList's "Top Anime" ranking via Jikan v4 (https://docs.api.jikan.moe).
 *
 * Isomorphic: the /topanime server render fetches page 1 and the browser
 * fetches later pages ("Show more"). Only the fields the page renders are
 * kept; a raw Jikan page is ~112 KB of unused data per 25 shows.
 *
 * Jikan allows ~3 requests/second and 60/minute. 429s, 5xx and network
 * failures are retried with a short backoff (honoring Retry-After when it is
 * small), then:
 * - server (isClient false): THROWS, so an ISR revalidation keeps the last
 *   good page and a first render falls through to app/topanime/error.tsx;
 * - client (isClient true): resolves to { ok: false, error } for inline UI.
 */

const DEFAULT_JIKAN_URL = "https://api.jikan.moe/v4";
const REQUEST_TIMEOUT_MS = 7_000;
const MAX_RETRY_WAIT_MS = 5_000;
const SERVER_MAX_ATTEMPTS = 3;
const CLIENT_MAX_ATTEMPTS = 2;

export interface TopAnimeItem {
  malId: number;
  /** MyAnimeList rank; null for the rare entry Jikan returns unranked. */
  rank: number | null;
  /** Default (usually romaji) title. */
  title: string;
  titleEnglish: string | null;
  /** MyAnimeList score, 1-10 with two decimals. */
  score: number | null;
  imageUrl: string | null;
  /** "TV", "Movie", "OVA", ... */
  type: string | null;
  episodes: number | null;
  year: number | null;
  members: number | null;
}

export interface TopAnimePage {
  items: TopAnimeItem[];
  hasNextPage: boolean;
  currentPage: number;
}

export type TopAnimeResult =
  | { ok: true; page: TopAnimePage }
  | { ok: false; error: string; rateLimited: boolean };

export class JikanError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "JikanError";
  }
}

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asPositiveInt = (value: unknown): number | null => {
  const n = asNumber(value);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asHttpsUrl = (value: unknown): string | null => {
  const url = asString(value);
  return url && url.startsWith("https://") ? url : null;
};

/** The ~225px-wide cover (webp first): plenty for a ~100px poster at 2x. */
const pickImage = (images: unknown): string | null => {
  if (!isRecord(images)) return null;
  for (const format of ["webp", "jpg"]) {
    const set = images[format];
    if (!isRecord(set)) continue;
    const url = asHttpsUrl(set.image_url) ?? asHttpsUrl(set.large_image_url);
    if (url) return url;
  }
  return null;
};

/** `year` is only set for seasonal releases; movies/OVAs fall back to the air date. */
const pickYear = (raw: RawRecord): number | null => {
  const year = asPositiveInt(raw.year);
  if (year !== null) return year;
  const aired = raw.aired;
  if (!isRecord(aired) || !isRecord(aired.prop) || !isRecord(aired.prop.from)) {
    return null;
  }
  return asPositiveInt(aired.prop.from.year);
};

export const toTopAnimeItem = (raw: unknown): TopAnimeItem | null => {
  if (!isRecord(raw)) return null;
  const malId = asPositiveInt(raw.mal_id);
  if (malId === null) return null;

  const title = asString(raw.title);
  const titleEnglish = asString(raw.title_english);
  return {
    malId,
    rank: asPositiveInt(raw.rank),
    title: title ?? titleEnglish ?? `MyAnimeList #${malId}`,
    titleEnglish,
    score: asNumber(raw.score),
    imageUrl: pickImage(raw.images),
    type: asString(raw.type),
    episodes: asPositiveInt(raw.episodes),
    year: pickYear(raw),
    members: asPositiveInt(raw.members),
  };
};

/** Jikan's ranking can repeat a show (within or across pages). First one wins. */
export const dedupeByMalId = (
  existing: TopAnimeItem[],
  incoming: TopAnimeItem[] = []
): TopAnimeItem[] => {
  const seen = new Set(existing.map((item) => item.malId));
  const fresh: TopAnimeItem[] = [];
  for (const item of incoming) {
    if (seen.has(item.malId)) continue;
    seen.add(item.malId);
    fresh.push(item);
  }
  return fresh.length ? [...existing, ...fresh] : existing;
};

/** Ascending rank, unranked last (Array#sort is stable, so ties keep Jikan's order). */
const byRank = (a: TopAnimeItem, b: TopAnimeItem) => {
  if (a.rank === b.rank) return 0;
  if (a.rank === null) return 1;
  if (b.rank === null) return -1;
  return a.rank - b.rank;
};

const toTopAnimePage = (json: unknown, requestedPage: number): TopAnimePage => {
  if (!isRecord(json) || !Array.isArray(json.data)) {
    throw new JikanError("Jikan returned an unexpected response");
  }
  const pagination = isRecord(json.pagination) ? json.pagination : {};
  const items = json.data
    .map(toTopAnimeItem)
    .filter((item): item is TopAnimeItem => item !== null);
  return {
    // Jikan orders tied scores loosely (…28, 31, 30, 29…); sort each page so the ranks read in order.
    items: dedupeByMalId([], items).sort(byRank),
    hasNextPage: pagination.has_next_page === true,
    currentPage: asPositiveInt(pagination.current_page) ?? requestedPage,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

/** ms to wait before the next attempt, or null when Retry-After is too long to wait for. */
const retryDelayMs = (res: Response | null, attempt: number): number | null => {
  const header = res?.headers.get("retry-after")?.trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      const ms = seconds * 1000;
      return ms <= MAX_RETRY_WAIT_MS ? ms : null;
    }
  }
  // Jikan's tightest window is per second.
  return 1_000 * attempt;
};

const describe = (err: unknown) =>
  err instanceof Error ? (err.name === "AbortError" ? "timed out" : err.message) : String(err);

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

const serverBaseUrl = () =>
  trimTrailingSlash(
    process.env.JINKANV4_URL || process.env.NEXT_PUBLIC_JINKANV4_URL || DEFAULT_JIKAN_URL
  );

const clientBaseUrl = () =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_JINKANV4_URL || DEFAULT_JIKAN_URL);

async function requestTopAnimePage(
  baseUrl: string,
  page: number,
  maxAttempts: number
): Promise<TopAnimePage> {
  const url = `${baseUrl}/top/anime?page=${page}`;

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      if (attempt < maxAttempts) {
        await sleep(retryDelayMs(null, attempt) ?? 0);
        continue;
      }
      throw new JikanError(`Jikan request failed: ${describe(err)}`);
    }

    if (res.ok) {
      const json: unknown = await res.json().catch(() => null);
      return toTopAnimePage(json, page);
    }

    if (isRetryableStatus(res.status) && attempt < maxAttempts) {
      const waitMs = retryDelayMs(res, attempt);
      if (waitMs !== null) {
        await sleep(waitMs);
        continue;
      }
    }
    throw new JikanError(`Jikan responded ${res.status} for page ${page}`, res.status);
  }
}

interface GetTopAnimeOptions {
  page?: number;
  isClient?: boolean;
}

/** Server: resolves to the page or throws a JikanError. */
export function getTopAnimeJinkan(
  options?: GetTopAnimeOptions & { isClient?: false }
): Promise<TopAnimePage>;
/** Browser: never rejects; failures come back as { ok: false, error }. */
export function getTopAnimeJinkan(
  options: GetTopAnimeOptions & { isClient: true }
): Promise<TopAnimeResult>;
export async function getTopAnimeJinkan({
  page = 1,
  isClient = false,
}: GetTopAnimeOptions = {}): Promise<TopAnimePage | TopAnimeResult> {
  const safePage = Number.isInteger(page) && page >= 1 ? page : 1;

  if (!isClient) {
    return requestTopAnimePage(serverBaseUrl(), safePage, SERVER_MAX_ATTEMPTS);
  }

  try {
    const result = await requestTopAnimePage(clientBaseUrl(), safePage, CLIENT_MAX_ATTEMPTS);
    return { ok: true, page: result };
  } catch (err) {
    const rateLimited = err instanceof JikanError && err.status === 429;
    return {
      ok: false,
      rateLimited,
      error: rateLimited
        ? "MyAnimeList's API (Jikan) is getting too many requests. Wait a few seconds and try again."
        : "Couldn't load more anime from MyAnimeList. Check your connection and try again.",
    };
  }
}
