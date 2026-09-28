import { allCurrAnimeTag } from "../../utils/anilist-queries/allCurrAnimeTag";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { normalizeMedia } from "@/lib/anime/normalize";
import type { AnimeMedia } from "@/lib/anime/types";
import { seasonStartMs, shiftSeason, toFuzzyDateInt } from "@/lib/season";
import type { SeasonName } from "@/lib/season";
import { selectCarryOver } from "@/lib/anime/carryOver";

/**
 * One page (50 shows, most popular first) of an AniList season.
 *
 * Isomorphic: the season page fetches page 1 on the server and the browser
 * fetches pages 2+. It never throws; callers branch on `ok` (the server page
 * throws on failure so ISR keeps the last good render).
 */

const ANILIST_URL =
  process.env.GRAPHQL_ANILIST ||
  process.env.NEXT_PUBLIC_GRAPHQL_ANILIST ||
  "https://graphql.anilist.co";

/** Pause after a response when fewer than this many requests remain in the window. */
const LOW_RATE_LIMIT_REMAINING = 10;
/** AniList currently allows ~30 requests/minute, i.e. one every 2 s. */
const LOW_RATE_LIMIT_PAUSE_MS = 2_000;
const DEFAULT_RETRY_AFTER_MS = 2_000;
const MAX_RETRY_AFTER_MS = 5_000;

export type SeasonPageResult =
  | {
      ok: true;
      media: AnimeMedia[];
      hasNextPage: boolean;
      page: number;
      /** Shows continuing from earlier seasons (only with `withCarryOver`). */
      carryOver: AnimeMedia[];
    }
  | { ok: false; error: string; status?: number };

interface SeasonPageOptions {
  page?: number;
  year: number | string;
  season: SeasonName;
  /** Per-request timeout in ms. */
  timeout?: number;
  /** Also fetch shows continuing from earlier seasons (same request; used for page 1). */
  withCarryOver?: boolean;
  enableLogs?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetchWithTimeout only times the request, not the body read. Every call goes
 * through the queue below, so a stalled body must not be able to hang it.
 */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AniList response timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Runs one AniList request (including its rate-limit pauses) at a time per
 * process. `next build` renders several season pages concurrently; without
 * this they would all hit AniList at once and the low-remaining pause would
 * not throttle anything.
 */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Retry-After in ms (seconds form only), capped so a page never hangs. */
function retryAfterMs(res: Response) {
  const header = res.headers.get("retry-after");
  const seconds = header === null || header.trim() === "" ? NaN : Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_RETRY_AFTER_MS;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

export function getAniListData(options: SeasonPageOptions): Promise<SeasonPageResult> {
  return enqueue(async () => {
    const result = await fetchSeasonPage(options);
    // The carry-over lists are extras: if the combined request fails (AniList
    // nulls every field when one errors), retry once with the season alone.
    // Not after a 429, which would only spend more of the rate limit.
    if (!result.ok && options.withCarryOver && result.status !== 429) {
      return fetchSeasonPage({ ...options, withCarryOver: false });
    }
    return result;
  });
}

async function fetchSeasonPage({
  page = 1,
  year,
  season,
  timeout = 8_000,
  enableLogs = false,
  withCarryOver = false,
}: SeasonPageOptions): Promise<SeasonPageResult> {
  const seasonStart = seasonStartMs(Number(year), season);
  const following = shiftSeason(Number(year), season, 1);
  const seasonEnd = seasonStartMs(following.year, following.season);
  const now = Date.now();
  const request = () =>
    fetchWithTimeout(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: allCurrAnimeTag,
        variables: {
          page,
          year: Number(year),
          season: season.toUpperCase(),
          withCarryOver,
          startBefore: toFuzzyDateInt(seasonStart),
          // Exclusive, and AniList dates are Japanese: a finale on the season's
          // first (JST) day is usually the previous evening in UTC, so require
          // the end date to be after it.
          endAfter: toFuzzyDateInt(seasonStart),
          airingSort: now < seasonStart ? ["START_DATE"] : ["POPULARITY_DESC"],
        },
      }),
      timeout,
    });

  try {
    let res = await request();
    if (res.status === 429) {
      await sleep(retryAfterMs(res));
      res = await request();
    }

    const remaining = res.headers.get("x-ratelimit-remaining");
    if (enableLogs) {
      console.log(`getAniListData ${year} ${season} p${page}`, res.status, remaining);
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: `AniList responded ${res.status}` };
    }

    // A missing header (e.g. not exposed to the browser via CORS) is not "0 remaining".
    if (remaining !== null && remaining.trim() !== "" && Number(remaining) < LOW_RATE_LIMIT_REMAINING) {
      await sleep(LOW_RATE_LIMIT_PAUSE_MS);
    }

    const json = await withDeadline(res.json(), timeout);
    const pageData = json?.data?.page;
    if (!Array.isArray(pageData?.media)) {
      return {
        ok: false,
        status: res.status,
        error: json?.errors?.[0]?.message ?? "AniList returned no media",
      };
    }

    const normalize = (list: unknown): AnimeMedia[] =>
      Array.isArray(list)
        ? list.map(normalizeMedia).filter((item): item is AnimeMedia => item !== null)
        : [];
    const media = normalize(pageData.media);

    return {
      ok: true,
      media,
      hasNextPage: pageData.pageInfo?.hasNextPage === true,
      page,
      carryOver: withCarryOver
        ? selectCarryOver({
            ended: normalize(json.data.ended?.media),
            airing: normalize(json.data.airing?.media),
            seasonMedia: media,
            season: { season: season.toUpperCase(), year: Number(year) },
            seasonStart,
            seasonEnd,
            now,
          })
        : [],
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
