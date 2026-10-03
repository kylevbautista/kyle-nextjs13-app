import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { readTopAnimePage, type TopAnimeResult } from "@/lib/topAnime";

/** The server waits through its own retries, so give it longer than one MAL request. */
const REQUEST_TIMEOUT_MS = 20_000;

export const RATE_LIMITED_MESSAGE =
  "MyAnimeList is getting too many requests. Wait a few seconds and try again.";
export const LOAD_FAILED_MESSAGE =
  "Couldn't load more anime from MyAnimeList. Check your connection and try again.";

/**
 * "Show more" in the browser: one page of the ranking from /api/top-anime
 * (the server talks to MyAnimeList). Never rejects; failures come back as
 * { ok: false, error } for the inline Retry.
 */
export async function loadTopAnimePage(page: number): Promise<TopAnimeResult> {
  try {
    const res = await fetchWithTimeout(`/api/top-anime?page=${page}`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const result = readTopAnimePage(await res.json().catch(() => null));
      if (result) return { ok: true, page: result };
    }
    const rateLimited = res.status === 429;
    return { ok: false, rateLimited, error: rateLimited ? RATE_LIMITED_MESSAGE : LOAD_FAILED_MESSAGE };
  } catch {
    return { ok: false, rateLimited: false, error: LOAD_FAILED_MESSAGE };
  }
}
