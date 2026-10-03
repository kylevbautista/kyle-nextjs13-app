import { mediaByIdsQuery } from "@/components/utils/anilist-queries/mediaByIdsQuery";
import { searchAnimeQuery } from "@/components/utils/anilist-queries/searchAnimeQuery";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { normalizeMedia } from "@/lib/anime/normalize";
import type { AnimeMedia } from "@/lib/anime/types";
import { SEARCH_PAGE_SIZE } from "@/lib/search";

/**
 * Server-side AniList client (search, list refresh). Unlike the isomorphic
 * components/animev3/utils/getAniListData.ts, this THROWS on failure so callers
 * can decide what to do (ISR keeps the last good page when a render throws).
 *
 * AniList's limit is currently 30 requests/minute; 429 responses carry
 * Retry-After and are retried once.
 */

const ANILIST_URL =
  process.env.GRAPHQL_ANILIST ||
  process.env.NEXT_PUBLIC_GRAPHQL_ANILIST ||
  "https://graphql.anilist.co";

const LOW_RATE_LIMIT_REMAINING = 5;
const MAX_RETRY_AFTER_MS = 5_000;

export class AniListError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** A 429's Retry-After in whole seconds, when AniList sent a number. */
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "AniListError";
  }
}

const parseRetryAfter = (value: string | null): number | undefined => {
  const seconds = Number(value?.trim());
  return value && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  { timeoutMs = 8_000, retryOn429 = true } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      timeout: timeoutMs,
      cache: "no-store",
    });
  } catch (err) {
    throw new AniListError(`AniList request failed: ${(err as Error)?.message ?? err}`);
  }

  if (res.status === 429 && retryOn429) {
    const retryAfter = res.headers.get("retry-after")?.trim();
    const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
    const waitMs =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds * 1000 : 2_000;
    if (waitMs <= MAX_RETRY_AFTER_MS) {
      await sleep(waitMs);
      return anilistQuery<T>(query, variables, { timeoutMs, retryOn429: false });
    }
  }

  // fetchWithTimeout only covers the headers; a stalled body must not hang the render.
  let bodyTimer: ReturnType<typeof setTimeout> | undefined;
  const json = await Promise.race([
    res.json().catch(() => null),
    new Promise<null>((resolve) => {
      bodyTimer = setTimeout(() => resolve(null), timeoutMs);
    }),
  ]).finally(() => clearTimeout(bodyTimer));
  if (!res.ok || !json?.data) {
    const message = json?.errors?.[0]?.message ?? res.statusText;
    throw new AniListError(
      `AniList responded ${res.status}: ${message}`,
      res.status,
      res.status === 429 ? parseRetryAfter(res.headers.get("retry-after")) : undefined
    );
  }

  const remainingHeader = res.headers.get("x-ratelimit-remaining");
  if (remainingHeader !== null && Number(remainingHeader) < LOW_RATE_LIMIT_REMAINING) {
    await sleep(1_500);
  }
  return json.data as T;
}

type PageResult = {
  page: {
    pageInfo?: { hasNextPage?: boolean; currentPage?: number };
    media: unknown[];
  };
};

const normalizeAll = (media: unknown[] = []) =>
  media.map(normalizeMedia).filter((item): item is AnimeMedia => item !== null);

/**
 * Fetches media by AniList id, 50 per request, sequentially. `onBatch` runs
 * after each request so callers can persist progress before a later batch fails.
 */
export async function fetchMediaByIds(
  ids: number[],
  onBatch?: (batch: AnimeMedia[]) => Promise<void>
): Promise<AnimeMedia[]> {
  const unique = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  const results: AnimeMedia[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const data = await anilistQuery<PageResult>(mediaByIdsQuery, { ids: unique.slice(i, i + 50) });
    const batch = normalizeAll(data.page?.media);
    if (onBatch && batch.length) await onBatch(batch);
    results.push(...batch);
  }
  return results;
}

/** One page of a title search (30 results). No total: AniList's is false here (lib/search.ts). */
export async function searchAnime(
  search: string,
  page = 1
): Promise<{ media: AnimeMedia[]; hasNextPage: boolean; page: number }> {
  const data = await anilistQuery<PageResult>(searchAnimeQuery, {
    search,
    page,
    perPage: SEARCH_PAGE_SIZE,
  });
  const pageInfo = data.page?.pageInfo ?? {};
  return {
    media: normalizeAll(data.page?.media),
    hasNextPage: Boolean(pageInfo.hasNextPage),
    page: pageInfo.currentPage ?? page,
  };
}
