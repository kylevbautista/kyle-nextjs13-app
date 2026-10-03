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
 * After a failure, this server instance stops asking MAL for a while (MAL's
 * Retry-After after a 429, a short cool-down otherwise) so a public route
 * can't keep hammering it during an outage.
 */

const DEFAULT_MAL_API_URL = "https://api.myanimelist.net/v2";
/** One deadline for the headers and the body together. */
const REQUEST_TIMEOUT_MS = 7_000;
const MAX_RETRY_WAIT_MS = 5_000;
/** Without a usable Retry-After, a 429 pauses this instance for a minute. */
const DEFAULT_RATE_LIMIT_PAUSE_S = 60;
const MAX_RATE_LIMIT_PAUSE_S = 600;
/** After a 5xx, a timeout or a network failure. */
const FAILURE_COOL_DOWN_MS = 15_000;

export class MyAnimeListError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** A 429's Retry-After in whole seconds, when MAL sent a number (or the pause still left). */
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

/* Per-instance pause after a failure (module state: each server instance has its own). */
let pausedUntil = 0;
let pausedStatus: number | undefined;

function pauseAfter(status: number | undefined, retryAfter: number | undefined) {
  const ms =
    status === 429
      ? Math.min(retryAfter ?? DEFAULT_RATE_LIMIT_PAUSE_S, MAX_RATE_LIMIT_PAUSE_S) * 1000
      : FAILURE_COOL_DOWN_MS;
  pausedUntil = Date.now() + ms;
  pausedStatus = status;
}

/** fetch + the JSON body under one abort deadline (a body that stalls after the headers is aborted too). */
async function fetchJson(url: string, headers: HeadersInit): Promise<{ res: Response; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    let json: unknown = null;
    if (res.ok) {
      try {
        json = await res.json();
      } catch (err) {
        // A stalled body is a network failure (retried); a body that isn't JSON is a bad response.
        if (controller.signal.aborted) throw err;
      }
    }
    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * When MAL produced the answer: its Date header, which Next's data cache keeps when a build reuses a
 * cached page 1. Never later than now; now when the header is missing.
 */
function answeredAt(res: Response): number {
  const now = Date.now();
  const date = Date.parse(res.headers.get("date") ?? "");
  return Number.isFinite(date) ? Math.min(date, now) : now;
}

export interface TopAnimeFetch {
  page: TopAnimePage;
  /** Epoch ms when MAL answered (see answeredAt). */
  fetchedAt: number;
}

/**
 * One page of MyAnimeList's ranking (25 shows), with a default fetch: Next doesn't data-cache it at
 * runtime (each ISR render and each /api/top-anime call asks MAL), but `next build` does, for the
 * page's revalidate, which is why `fetchedAt` comes from MAL's Date header. Throws a MyAnimeListError.
 */
export async function fetchTopAnimePage(
  page: number,
  { attempts = 3 }: { attempts?: number } = {}
): Promise<TopAnimeFetch> {
  const id = clientId();
  const left = pausedUntil - Date.now();
  if (left > 0) {
    throw new MyAnimeListError(
      "MyAnimeList is paused after a recent failure",
      pausedStatus,
      pausedStatus === 429 ? Math.ceil(left / 1000) : undefined
    );
  }

  const params = new URLSearchParams({
    ranking_type: "all",
    limit: String(TOP_ANIME_PAGE_SIZE),
    offset: String((page - 1) * TOP_ANIME_PAGE_SIZE),
    fields: MAL_RANKING_FIELDS,
  });
  const url = `${apiUrl()}/anime/ranking?${params}`;
  const headers = { Accept: "application/json", "X-MAL-CLIENT-ID": id };

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    let json: unknown;
    try {
      ({ res, json } = await fetchJson(url, headers));
    } catch (err) {
      if (attempt < attempts) {
        await sleep(retryDelayMs(null, attempt) ?? 0);
        continue;
      }
      pauseAfter(undefined, undefined);
      throw new MyAnimeListError(`MyAnimeList request failed: ${describe(err)}`);
    }

    if (res.ok) {
      const result = toTopAnimePage(json, page);
      if (!result) throw new MyAnimeListError(`MyAnimeList returned an unexpected response for page ${page}`);
      return { page: result, fetchedAt: answeredAt(res) };
    }

    if (isRetryableStatus(res.status) && attempt < attempts) {
      const waitMs = retryDelayMs(res, attempt);
      if (waitMs !== null) {
        await sleep(waitMs);
        continue;
      }
    }
    const retryAfter = res.status === 429 ? retryAfterSeconds(res) : undefined;
    if (isRetryableStatus(res.status)) pauseAfter(res.status, retryAfter);
    throw new MyAnimeListError(`MyAnimeList responded ${res.status} for page ${page}`, res.status, retryAfter);
  }
}
