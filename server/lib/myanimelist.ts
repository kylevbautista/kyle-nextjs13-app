import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import {
  MAL_RANKING_FIELDS,
  TOP_ANIME_PAGE_SIZE,
  toTopAnimePage,
  type TopAnimePage,
} from "@/lib/topAnime";

/**
 * Server-side MyAnimeList API v2 client: the "Top Anime" ranking for
 * /topanime (page 1, in its ISR render) and /api/top-anime (later pages, for
 * "Show more"). Public data needs only the app's Client ID, sent as
 * X-MAL-CLIENT-ID; MAL_CLIENT_SECRET is for user OAuth and is never read.
 * Keep this module server-only: the Client ID must not reach the browser
 * (MAL's API has no CORS for browsers anyway).
 *
 * MAL doesn't publish a rate limit. 429s, 5xx and network failures are
 * retried with a short backoff (Retry-After when it is short), then this
 * THROWS a MyAnimeListError, so an ISR render keeps the last good page.
 */

const DEFAULT_MAL_API_URL = "https://api.myanimelist.net/v2";
const REQUEST_TIMEOUT_MS = 7_000;
const MAX_RETRY_WAIT_MS = 5_000;

export class MyAnimeListError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** A 429's Retry-After in whole seconds, when MAL sent a number. */
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "MyAnimeListError";
  }
}

const apiUrl = () => (process.env.MAL_API_URL || DEFAULT_MAL_API_URL).replace(/\/+$/, "");

function clientId(): string {
  const id = process.env.MAL_CLIENT_ID?.trim();
  if (!id) throw new MyAnimeListError('Missing environment variable "MAL_CLIENT_ID" (see CLAUDE.md §1)');
  return id;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

const retryAfterSeconds = (res: Response): number | undefined => {
  const header = res.headers.get("retry-after")?.trim();
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : undefined;
};

/** ms to wait before the next attempt, or null when Retry-After is too long to wait for. */
const retryDelayMs = (res: Response | null, attempt: number): number | null => {
  const seconds = res ? retryAfterSeconds(res) : undefined;
  if (seconds !== undefined) return seconds * 1000 <= MAX_RETRY_WAIT_MS ? seconds * 1000 : null;
  return 1_000 * attempt;
};

const describe = (err: unknown) =>
  err instanceof Error ? (err.name === "AbortError" ? "timed out" : err.message) : String(err);

export interface TopAnimeFetchOptions {
  /** Attempts before throwing (default 3). */
  attempts?: number;
  /**
   * Seconds to keep MAL's answer in Next's data cache (shared by every caller of the same page).
   * Omit on the ISR page: its default fetch runs once per render, so "fetched at" stays true.
   */
  cacheSeconds?: number;
}

/** One page of MyAnimeList's ranking (25 shows). Throws a MyAnimeListError on failure. */
export async function fetchTopAnimePage(
  page: number,
  { attempts = 3, cacheSeconds }: TopAnimeFetchOptions = {}
): Promise<TopAnimePage> {
  const params = new URLSearchParams({
    ranking_type: "all",
    limit: String(TOP_ANIME_PAGE_SIZE),
    offset: String((page - 1) * TOP_ANIME_PAGE_SIZE),
    fields: MAL_RANKING_FIELDS,
  });
  const url = `${apiUrl()}/anime/ranking?${params}`;
  const headers = { Accept: "application/json", "X-MAL-CLIENT-ID": clientId() };
  const cache: RequestInit =
    cacheSeconds !== undefined ? { cache: "force-cache", next: { revalidate: cacheSeconds } } : {};

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, { timeout: REQUEST_TIMEOUT_MS, headers, ...cache });
    } catch (err) {
      if (attempt < attempts) {
        await sleep(retryDelayMs(null, attempt) ?? 0);
        continue;
      }
      throw new MyAnimeListError(`MyAnimeList request failed: ${describe(err)}`);
    }

    if (res.ok) {
      const json: unknown = await res.json().catch(() => null);
      const result = toTopAnimePage(json, page);
      if (!result) throw new MyAnimeListError(`MyAnimeList returned an unexpected response for page ${page}`);
      return result;
    }

    if (isRetryableStatus(res.status) && attempt < attempts) {
      const waitMs = retryDelayMs(res, attempt);
      if (waitMs !== null) {
        await sleep(waitMs);
        continue;
      }
    }
    throw new MyAnimeListError(
      `MyAnimeList responded ${res.status} for page ${page}`,
      res.status,
      res.status === 429 ? retryAfterSeconds(res) : undefined
    );
  }
}
