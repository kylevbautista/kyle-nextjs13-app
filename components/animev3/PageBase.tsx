"use client";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AnimeInfoGrid from "./AnimeInfoGrid";
import AnimeInfoSkeleton from "./AnimeInfoSkeleton";
import Grid from "../common/Grid";
import { HeaderContext } from "./layoutSelector/HeaderProvider";
import useLazyLoad from "./utils/useLazyLoad";
import { isStale, mergeFresh, recallRefresh, rememberRefresh } from "./utils/seasonFreshness";
import { getAniListData } from "./utils/getAniListData";
import { nextAiring } from "@/lib/anime/airing";
import type { AnimeMedia } from "@/lib/anime/types";
import { SEASON_LABELS, SeasonName, seasonStartMs, shiftSeason } from "@/lib/season";

interface PageBaseProps {
  year: number;
  season: SeasonName;
  /** Page 1 from AniList (server-fetched), most popular first. */
  initialMedia: AnimeMedia[];
  initialHasNextPage: boolean;
  /** Series from earlier seasons still airing in this one (lib/anime/carryOver.ts). */
  initialCarryOver: AnimeMedia[];
  /** When the server fetched that data (the page may be an old ISR render). */
  fetchedAt: number;
}

type LoadStatus = "idle" | "loading" | "error";

/** In countdown mode, pages up to this one load eagerly (seasons rarely pass 3 pages). */
const MAX_EAGER_PAGE = 6;

/** Most AniList list entries first; unknown popularity last. Stable. */
const compareByPopularity = (a: AnimeMedia, b: AnimeMedia) =>
  (b.popularity ?? -1) - (a.popularity ?? -1);

/**
 * Countdown order for one season: soonest episode *airing during that season*
 * first, then by popularity. Episodes outside the season don't count, so a
 * past or upcoming season doesn't open with today's long runners.
 */
function countdownComparator(seasonStart: number, seasonEnd: number) {
  const airsAt = (media: AnimeMedia) => {
    const next = nextAiring(media);
    const at = next ? next.airingAt * 1000 : Number.POSITIVE_INFINITY;
    return at >= seasonStart && at < seasonEnd ? at : Number.POSITIVE_INFINITY;
  };
  return (a: AnimeMedia, b: AnimeMedia) => {
    const ta = airsAt(a);
    const tb = airsAt(b);
    return ta === tb ? compareByPopularity(a, b) : ta < tb ? -1 : 1;
  };
}

/** Appends shows not seen yet, keeping AniList's popularity order. */
function appendUnique(current: AnimeMedia[], incoming: AnimeMedia[]) {
  const seen = new Set(current.map((item) => item.id));
  const added: AnimeMedia[] = [];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    added.push(item);
  }
  return added.length ? [...current, ...added] : current;
}

export default function PageBase({
  year,
  season,
  initialMedia,
  initialHasNextPage,
  initialCarryOver,
  fetchedAt,
}: PageBaseProps) {
  const { sort, showContinuing } = useContext(HeaderContext);
  const compareCountdown = useMemo(() => {
    const following = shiftSeason(year, season, 1);
    return countdownComparator(seasonStartMs(year, season), seasonStartMs(following.year, following.season));
  }, [year, season]);

  // Page-1 data: the server's, or this session's newer browser refresh of it
  // (see seasonFreshness.ts — back/forward replays the original payload).
  const seasonKey = `${year}-${season}`;
  const [seed] = useState(
    () =>
      recallRefresh(seasonKey, fetchedAt) ?? {
        at: fetchedAt,
        media: initialMedia,
        carryOver: initialCarryOver,
        hasNextPage: initialHasNextPage,
      }
  );

  // Every fetched show, deduped, in popularity (fetch) order. Everything shown is derived from it.
  const [media, setMedia] = useState(() => appendUnique([], seed.media));
  const [cursor, setCursor] = useState({ nextPage: 2, hasNextPage: seed.hasNextPage });
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [carryOver, setCarryOver] = useState(seed.carryOver);
  const [announcement, setAnnouncement] = useState("");

  // Continuing series, minus any that turn up in the season's own pages
  // (AniList files e.g. late-June premieres under summer). In popularity mode,
  // ones less popular than everything loaded so far wait for the season's
  // later pages, so they don't jump ahead of more popular new shows.
  const continuing = useMemo(() => {
    if (!showContinuing) return [];
    const seasonIds = new Set(media.map((item) => item.id));
    const floor =
      sort === "popularity" && cursor.hasNextPage && media.length
        ? Math.min(...media.map((item) => item.popularity ?? 0))
        : Number.NEGATIVE_INFINITY;
    return carryOver.filter(
      (item) => !seasonIds.has(item.id) && (item.popularity ?? 0) >= floor
    );
  }, [carryOver, media, showContinuing, sort, cursor.hasNextPage]);
  const continuingIds = useMemo(() => new Set(continuing.map((item) => item.id)), [continuing]);

  // Cards already on screen keep their place when later pages arrive; those
  // pages are sorted in *behind* them (a strict re-sort would reshuffle the
  // cards being read, e.g. the 12 in the server HTML). Changing the sort or
  // the continuing toggle re-sorts everything.
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const view = `${sort}|${showContinuing}`;
  const [pinnedForView, setPinnedForView] = useState(view);
  if (pinnedForView !== view) {
    setPinnedForView(view);
    setPinnedIds([]);
  }
  /** Ids on screen as of the last render (read when a page arrives). */
  const visibleIds = useRef<number[]>([]);

  // Guards: one request at a time, and never a page that already loaded
  // (an observer holding an older fetchMore can fire before the re-render).
  const busy = useRef(false);
  const loadedThrough = useRef(1);

  const fetchMore = useCallback(async () => {
    const page = cursor.nextPage;
    if (busy.current || !cursor.hasNextPage || page <= loadedThrough.current) return;

    busy.current = true;
    setStatus("loading");
    setAnnouncement("");
    const result = await getAniListData({ page, year, season });
    busy.current = false;

    if (!result.ok) {
      setStatus("error");
      return;
    }
    loadedThrough.current = page;
    setPinnedIds(visibleIds.current);
    // Browser-fetched pages are fresher than the (possibly old) server data,
    // so they also update shows already in the list.
    setMedia((current) => mergeFresh(current, result.media));
    setCursor({ nextPage: page + 1, hasNextPage: result.hasNextPage });
    setStatus("idle");
  }, [cursor, year, season]);

  // The page may be a cached (ISR) render from a while ago: the first visit
  // after a quiet spell gets the last render while Next rebuilds it. If the
  // data is over 10 minutes old, re-fetch page 1 + continuing series from the
  // browser right away (one AniList request, queued before later pages).
  useEffect(() => {
    if (!isStale(seed.at, Date.now())) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // No season-only fallback here: if this fails, the page keeps what it has.
      const result = await getAniListData({
        page: 1,
        year,
        season,
        withCarryOver: true,
        fallbackWithoutCarryOver: false,
      });
      if (cancelled || !result.ok) return;
      // Not scrolled yet: re-sort (the stale countdown order is wrong anyway).
      // Scrolled: keep the revealed cards where they are.
      setPinnedIds(window.scrollY > 50 ? visibleIds.current : []);
      // Before page 2 has loaded (the usual case: the queue runs this first),
      // page 1 is replaced outright, so shows that left it don't linger stale.
      const onlyPageOne = loadedThrough.current === 1;
      setMedia((current) =>
        onlyPageOne ? appendUnique([], result.media) : mergeFresh(current, result.media)
      );
      if (result.carryOverIncluded) setCarryOver(result.carryOver);
      setCursor((current) =>
        current.nextPage === 2 ? { ...current, hasNextPage: result.hasNextPage } : current
      );
      setAnnouncement("Updated with the latest schedule from AniList.");
      rememberRefresh(seasonKey, {
        at: Date.now(),
        media: result.media,
        carryOver: result.carryOver,
        hasNextPage: result.hasNextPage,
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [seed, seasonKey, year, season]);

  // In countdown mode, load the rest of the season right away (not on scroll),
  // so the order behind the pinned cards is complete before the reader gets there.
  useEffect(() => {
    if (sort !== "countdown" || !cursor.hasNextPage || status !== "idle") return;
    if (cursor.nextPage > MAX_EAGER_PAGE) return;
    const timer = setTimeout(() => void fetchMore(), 0);
    return () => clearTimeout(timer);
  }, [sort, cursor, status, fetchMore]);

  const sorted = useMemo(() => {
    const all = [...media, ...continuing];
    const byId = new Map(all.map((item) => [item.id, item]));
    const pinned = pinnedIds.flatMap((id) => byId.get(id) ?? []);
    const pinnedSet = new Set(pinnedIds);
    const rest = all
      .filter((item) => !pinnedSet.has(item.id))
      .sort(sort === "countdown" ? compareCountdown : compareByPopularity);
    return [...pinned, ...rest];
  }, [media, continuing, sort, pinnedIds, compareCountdown]);

  const { visibleCount, hasMore, sentinelRef } = useLazyLoad({
    total: sorted.length,
    canFetchMore: cursor.hasNextPage && status !== "error",
    fetchMore,
  });

  useEffect(() => {
    visibleIds.current = sorted.slice(0, visibleCount).map((item) => item.id);
  });

  const allFetchedVisible = visibleCount >= sorted.length;

  if (sorted.length === 0 && !cursor.hasNextPage) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center text-white">
        <p className="text-4xl" aria-hidden="true">
          (・_・?)
        </p>
        <p className="mt-3 text-lg font-bold">
          {`No anime listed for ${SEASON_LABELS[season]} ${year} yet.`}
        </p>
        <p className="text-sm text-[rgb(164,164,164)]">
          AniList adds shows as they are announced. Check back closer to the season!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-white sm:p-4">
      {media.length === 0 && !cursor.hasNextPage && (
        <p className="mb-4 rounded-lg border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-4 py-2 text-center text-sm text-[rgb(164,164,164)]">
          {`No new shows announced for ${SEASON_LABELS[season]} ${year} yet — these series are expected to still be airing.`}
        </p>
      )}
      <Grid>
        {sorted.slice(0, visibleCount).map((info) => (
          <AnimeInfoGrid key={info.id} info={info} continuing={continuingIds.has(info.id)} />
        ))}
        {hasMore && <AnimeInfoSkeleton forwardedRef={sentinelRef} />}
      </Grid>

      <p className="sr-only" aria-live="polite">
        {status === "loading" ? "Loading more anime…" : announcement}
      </p>

      {status === "error" && allFetchedVisible && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-4 py-3 text-sm"
        >
          <span>Couldn&apos;t load more from AniList.</span>
          <button
            type="button"
            onClick={() => void fetchMore()}
            className="rounded-full bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
