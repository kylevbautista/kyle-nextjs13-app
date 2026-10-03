import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { readTopAnimePage, type TopAnimeResult } from "@/lib/topAnime";

/** /api/top-anime makes one MAL request (7 s at most), so this is generous. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * On a 429: the wait the route passed on in Retry-After (MAL's own, or what's left of this server's
 * pause after it), when it's a sane whole number of seconds.
 */
export function rateLimitedMessage(retryAfterSeconds: number | null): string {
  const known =
    retryAfterSeconds !== null &&
    Number.isInteger(retryAfterSeconds) &&
    retryAfterSeconds > 0 &&
    retryAfterSeconds <= 600;
  return `MyAnimeList is limiting this site's requests right now. ${
    known ? `Try again in ${retryAfterSeconds} ${retryAfterSeconds === 1 ? "second" : "seconds"}.` : "Wait up to a minute, then try again."
  }`;
}
/** Our server answered with an error: MyAnimeList didn't (the route's 502, or a function timeout). */
export const UPSTREAM_FAILED_MESSAGE = "MyAnimeList didn't answer. Try again in a moment.";
/** The request to this site itself failed (offline, no answer in time, or a page that isn't ours). */
export const CONNECTION_FAILED_MESSAGE = "Couldn't load more of the ranking. Check your connection and try again.";

const retryAfter = (res: Response): number | null => {
  const header = res.headers.get("retry-after")?.trim();
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds : null;
};

/**
 * "Show more" in the browser: one page of the ranking from /api/top-anime
 * (the server talks to MyAnimeList). Never rejects; failures come back as
 * { ok: false, error } for the inline Retry, worded by what actually failed.
 */
export async function loadTopAnimePage(page: number): Promise<TopAnimeResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`/api/top-anime?page=${page}`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { Accept: "application/json" },
    });
  } catch {
    return { ok: false, rateLimited: false, error: CONNECTION_FAILED_MESSAGE };
  }
  if (res.status === 429) {
    return { ok: false, rateLimited: true, error: rateLimitedMessage(retryAfter(res)) };
  }
  if (res.ok) {
    const result = readTopAnimePage(await res.json().catch(() => null));
    if (result) return { ok: true, page: result };
    // A 200 that isn't our JSON came from something between (a captive portal, a proxy).
    return { ok: false, rateLimited: false, error: CONNECTION_FAILED_MESSAGE };
  }
  return { ok: false, rateLimited: false, error: UPSTREAM_FAILED_MESSAGE };
}
