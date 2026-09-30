import { enqueueAniListRequest, getAniListData } from "@/components/animev3/utils/getAniListData";
import type { SeasonPageResult } from "@/components/animev3/utils/getAniListData";
import { landingExtrasQuery } from "@/components/utils/anilist-queries/landingExtrasQuery";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import type { AnimeMedia } from "@/lib/anime/types";
import {
  RIMURU_CHARACTER_ID,
  TEMPEST_IDS,
  buildSeasonMeta,
  parseLandingExtras,
  pickAiringCandidates,
  seasonShowCount,
  tempestFromExtras,
  type LandingData,
  type LandingExtras,
} from "@/lib/landing";
import { landingSeason, type SeasonName } from "@/lib/season";

/**
 * Data for the landing page ("/", ISR 600 s). Server-only.
 *
 * AniList budget: at most 2 requests per regeneration.
 * 1. The season request is exactly /anime's page 1 (same query, same queue,
 *    default fetch cache: fetched once per regeneration, route stays ISR).
 * 2. The extras (Tensura franchise, Rimuru, exact season count) go through
 *    Next's data cache for an hour, so most regenerations spend nothing on
 *    them. Skipped when the season call already spent 2 requests (429 retry).
 *
 * Failures: a running production server rethrows a failed season request,
 * so ISR keeps serving the last good page and retries on the next request
 * (as the season pages do). `next build` has no earlier page to keep and
 * `next dev` has no cache, so both render fallbacks instead. Everything else
 * (the extras, parsing) always degrades to a fallback. Don't use the server
 * AniList client (server/lib/anilist.ts) here: it opts out of Next's cache,
 * which would make the route dynamic and call AniList on every view.
 */

const ANILIST_URL =
  process.env.GRAPHQL_ANILIST ||
  process.env.NEXT_PUBLIC_GRAPHQL_ANILIST ||
  "https://graphql.anilist.co";

const REQUEST_TIMEOUT_MS = 6_000;
const EXTRAS_REVALIDATE_SECONDS = 3_600;
/** Days ahead a next episode may be to count as "airing next". */
const WINDOW_DAYS = 7;
/** In preview mode the season hasn't started: look far enough to reach its premieres. */
const PREVIEW_WINDOW_DAYS = 16;
/** Upper bound on the requests one regeneration may send. */
const MAX_REQUESTS = 2;

/** A production server with a cached page to fall back on (not the build, not dev). */
const keepsLastGoodPage = () =>
  process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";

/** fetchWithTimeout only times the headers; the body read gets its own deadline. */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AniList response timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * The cached extras request. Next's data cache keys it on the body, so the
 * variables (and so the season) are part of the key. Only 200s are cached;
 * a 200 carrying GraphQL errors is parsed part by part.
 */
export async function fetchLandingExtras(target: {
  year: number;
  season: SeasonName;
}): Promise<LandingExtras | null> {
  try {
    return await enqueueAniListRequest(async () => {
      const res = await fetchWithTimeout(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query: landingExtrasQuery,
          variables: {
            ids: TEMPEST_IDS,
            characterId: RIMURU_CHARACTER_ID,
            season: target.season.toUpperCase(),
            seasonYear: target.year,
          },
        }),
        cache: "force-cache",
        next: { revalidate: EXTRAS_REVALIDATE_SECONDS, tags: ["landing-extras"] },
        timeout: REQUEST_TIMEOUT_MS,
      });
      if (!res.ok) {
        console.warn(`[landing] extras: AniList responded ${res.status}`);
        return null;
      }
      return parseLandingExtras(await withDeadline(res.json(), REQUEST_TIMEOUT_MS));
    });
  } catch (err) {
    console.warn("[landing] extras failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function buildLandingData(
  nowMs: number,
  target: ReturnType<typeof landingSeason>,
  season: SeasonPageResult | null,
  extras: LandingExtras | null
): LandingData {
  const tempest = tempestFromExtras(extras);
  const mediaById: Record<number, AnimeMedia> = {};
  // Live Tempest media are addable (full snapshots); the fallback isn't.
  if (tempest.live) {
    for (const item of extras?.tempest?.media ?? []) mediaById[item.id] = item;
  }

  if (!season?.ok) {
    return {
      generatedAt: nowMs,
      season: null,
      airingIds: [],
      continuingIds: [],
      tempest,
      mediaById,
    };
  }

  const carryOver = season.carryOverIncluded ? season.carryOver : [];
  const { ids: airingIds, continuingIds } = pickAiringCandidates(
    season.media,
    carryOver,
    season.fetchedAt,
    { windowDays: target.preview ? PREVIEW_WINDOW_DAYS : WINDOW_DAYS, pool: 30, limit: 12 }
  );
  const byId = new Map<number, AnimeMedia>();
  for (const item of [...season.media, ...carryOver]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  for (const id of airingIds) {
    const item = byId.get(id);
    if (item) mediaById[id] = item;
  }

  const exact = extras?.seasonCount ?? null;
  const known = exact ? exact.count : season.media.length;
  const showCount =
    known > 0
      ? seasonShowCount({
          exact,
          pageOneCount: season.media.length,
          hasNextPage: season.hasNextPage,
        })
      : null;

  return {
    generatedAt: season.fetchedAt,
    season: buildSeasonMeta(target, {
      showCount,
      continuingCount: season.carryOverIncluded ? season.carryOver.length : null,
    }),
    airingIds,
    continuingIds,
    tempest,
    mediaById,
  };
}

/**
 * Everything the landing renders, loaded once per regeneration. Sequential:
 * the season request first, then the extras only while the budget allows.
 * Throws only for a failed season request on a production server (see top).
 */
export async function loadLandingData(nowMs: number = Date.now()): Promise<LandingData> {
  const target = landingSeason(new Date(nowMs));

  let season: SeasonPageResult | null = null;
  try {
    season = await getAniListData({
      page: 1,
      year: target.year,
      season: target.season,
      withCarryOver: true,
      fallbackWithoutCarryOver: false,
      timeout: REQUEST_TIMEOUT_MS,
    });
    if (!season.ok) console.warn("[landing] season request failed:", season.error);
  } catch (err) {
    // getAniListData never throws; this is belt and braces.
    console.warn("[landing] season request threw:", err instanceof Error ? err.message : err);
  }
  if (!season?.ok && keepsLastGoodPage()) {
    throw new Error("Landing: the AniList season request failed; keeping the last good page");
  }

  const spent = season?.requests ?? 0;
  const extras = spent < MAX_REQUESTS ? await fetchLandingExtras(target) : null;

  try {
    return buildLandingData(nowMs, target, season, extras);
  } catch (err) {
    console.warn("[landing] building data failed:", err instanceof Error ? err.message : err);
    return buildLandingData(nowMs, target, null, null);
  }
}
