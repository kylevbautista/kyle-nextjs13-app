"use client";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AnimeInfoGrid from "./AnimeInfoGrid";
import AnimeInfoSkeleton from "./AnimeInfoSkeleton";
import Grid from "../common/Grid";
import { HeaderContext } from "./layoutSelector/HeaderProvider";
import useLazyLoad from "./utils/useLazyLoad";
import { getAniListData } from "./utils/getAniListData";
import { compareByNextAiring } from "@/lib/anime/airing";
import type { AnimeMedia } from "@/lib/anime/types";
import { SEASON_LABELS, SeasonName } from "@/lib/season";

interface PageBaseProps {
  year: number;
  season: SeasonName;
  /** Page 1 from AniList (server-fetched), most popular first. */
  initialMedia: AnimeMedia[];
  initialHasNextPage: boolean;
}

type LoadStatus = "idle" | "loading" | "error";

/** In countdown mode, pages up to this one load eagerly (seasons rarely pass 3 pages). */
const MAX_EAGER_PAGE = 6;

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
}: PageBaseProps) {
  const { sort } = useContext(HeaderContext);

  // Every fetched show, deduped, in popularity (fetch) order. Everything shown is derived from it.
  const [media, setMedia] = useState(() => appendUnique([], initialMedia));
  const [cursor, setCursor] = useState({ nextPage: 2, hasNextPage: initialHasNextPage });
  const [status, setStatus] = useState<LoadStatus>("idle");

  // Cards already on screen keep their place when later pages arrive; those
  // pages are sorted in *behind* them (a strict re-sort would reshuffle the
  // cards being read, e.g. the 12 in the server HTML). Changing the sort
  // re-sorts everything.
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [pinnedForSort, setPinnedForSort] = useState(sort);
  if (pinnedForSort !== sort) {
    setPinnedForSort(sort);
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
    const result = await getAniListData({ page, year, season });
    busy.current = false;

    if (!result.ok) {
      setStatus("error");
      return;
    }
    loadedThrough.current = page;
    if (sort === "countdown") setPinnedIds(visibleIds.current);
    setMedia((current) => appendUnique(current, result.media));
    setCursor({ nextPage: page + 1, hasNextPage: result.hasNextPage });
    setStatus("idle");
  }, [cursor, year, season, sort]);

  // In countdown mode, load the rest of the season right away (not on scroll),
  // so the order behind the pinned cards is complete before the reader gets there.
  useEffect(() => {
    if (sort !== "countdown" || !cursor.hasNextPage || status !== "idle") return;
    if (cursor.nextPage > MAX_EAGER_PAGE) return;
    const timer = setTimeout(() => void fetchMore(), 0);
    return () => clearTimeout(timer);
  }, [sort, cursor, status, fetchMore]);

  // Array.prototype.sort is stable, so shows with the same (or no) air time keep popularity order.
  const sorted = useMemo(() => {
    if (sort !== "countdown") return media;
    const byId = new Map(media.map((item) => [item.id, item]));
    const pinned = pinnedIds.flatMap((id) => byId.get(id) ?? []);
    const pinnedSet = new Set(pinnedIds);
    const rest = media.filter((item) => !pinnedSet.has(item.id)).sort(compareByNextAiring);
    return [...pinned, ...rest];
  }, [media, sort, pinnedIds]);

  const { visibleCount, hasMore, sentinelRef } = useLazyLoad({
    total: sorted.length,
    canFetchMore: cursor.hasNextPage && status !== "error",
    fetchMore,
  });

  useEffect(() => {
    visibleIds.current = sorted.slice(0, visibleCount).map((item) => item.id);
  });

  const allFetchedVisible = visibleCount >= sorted.length;

  if (media.length === 0 && !cursor.hasNextPage) {
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
      <Grid>
        {sorted.slice(0, visibleCount).map((info) => (
          <AnimeInfoGrid key={info.id} info={info} />
        ))}
        {hasMore && <AnimeInfoSkeleton forwardedRef={sentinelRef} />}
      </Grid>

      <p className="sr-only" aria-live="polite">
        {status === "loading" ? "Loading more anime…" : ""}
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
