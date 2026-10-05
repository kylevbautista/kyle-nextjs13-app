"use client";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { flushSync, preconnect } from "react-dom";
import { HeaderContext } from "./layoutSelector/HeaderProvider";
import SeasonBanner from "./season/SeasonBanner";
import SeasonControls from "./season/SeasonControls";
import {
  ContinuingHiddenPanel,
  EmptySeasonPanel,
  FormatsHiddenNote,
  FormatsHiddenPanel,
  OnlyContinuingNote,
} from "./season/SeasonEmpty";
import { LoadMoreError, OrderDivider, SeasonEndCard } from "./season/SeasonGridNotices";
import useLazyLoad, { REVEAL_CHUNK } from "./utils/useLazyLoad";
import { isStale, mergeFresh, recallRefresh, rememberRefresh } from "./utils/seasonFreshness";
import { getAniListData } from "./utils/getAniListData";
import { useAnimeDetails } from "@/components/theme/AnimeDetailsDialog";
import { CARD_LAYOUT } from "@/components/theme/cardLayout";
import { APP_CONTAINER, SECTION_TITLE_CLASS, SOFT_TEXT, TEXT_LINK } from "@/components/theme/tokens";
import { isPlainClick } from "@/components/utils/isPlainClick";
import { nextAiring } from "@/lib/anime/airing";
import {
  STATUS,
  anilistSeasonUrl,
  continuingLabel,
  countLabel,
  endCardNote,
  endCardText,
  headingSr,
  hiddenLabel,
  noscriptText,
  seasonLabelOf,
  spokenContinuing,
} from "@/lib/anime/seasonCopy";
import {
  appendUnique,
  countdownComparator,
  inSeasonAiringAt,
  orderSeason,
  pinnedPrefixLength,
  seasonWindow,
  selectContinuing,
  soonerBelow,
  type SortMode,
} from "@/lib/anime/seasonOrder";
import {
  filterByFormat,
  formatCounts,
  hiddenWithShows,
  toggleFormat as toggledFormats,
  type FormatKey,
} from "@/lib/anime/seasonFormats";
import type { AnimeMedia } from "@/lib/anime/types";
import type { SeasonName } from "@/lib/season";

interface PageBaseProps {
  year: number;
  season: SeasonName;
  /** Page 1 from AniList (server-fetched), most popular first. */
  initialMedia: AnimeMedia[];
  initialHasNextPage: boolean;
  /** Series from earlier seasons still airing in this one (lib/anime/carryOver.ts). */
  initialCarryOver: AnimeMedia[];
  /** False when the server's request fell back to the season alone (no continuing series fetched). */
  initialCarryOverIncluded: boolean;
  /** A carry-over list hit AniList's 50-item page. */
  initialCarryOverCapped: boolean;
  /** When the server fetched that data (the page may be an old ISR render). */
  fetchedAt: number;
}

type LoadStatus = "idle" | "loading" | "error";

/** Later pages load right after hydration up to this one (a season of 101–150 shows takes 3 pages). */
const MAX_EAGER_PAGE = 6;
/**
 * Sorts that load the rest of the season right away, not on scroll: the
 * count, the end card and the banner's Next-episodes card need every page.
 * ["countdown"] restores the scroll-only loading of popularity mode.
 */
const EAGER_SORTS: readonly SortMode[] = ["countdown", "popularity"];
/**
 * Which cards keep their place when a later page arrives: the ones on screen
 * or scrolled past ("onScreen"), or every revealed card ("revealed").
 */
const PIN_SCOPE: "onScreen" | "revealed" = "onScreen";

const BROWSER_ANILIST_URL = process.env.NEXT_PUBLIC_GRAPHQL_ANILIST || "https://graphql.anilist.co";

/** The season card: the classic layout or the poster (components/theme/cardLayout.ts). */
const { Card, Skeleton } = CARD_LAYOUT;

/**
 * Ids of the revealed cards on screen or scrolled past (plus the focused
 * card), in display order. Reads the DOM, so only call it from event
 * handlers and async callbacks, never during render.
 */
function pinnedOnScreenIds(grid: HTMLElement | null, ids: readonly number[], viewportHeight: number): number[] {
  if (!grid) return [...ids];
  const cards = Array.from(grid.querySelectorAll<HTMLElement>(":scope > li[data-card-index]"));
  const tops = cards.map((li) => li.getBoundingClientRect().top);
  const focused = document.activeElement?.closest<HTMLElement>("li[data-card-index]") ?? null;
  const focusedIndex = focused && grid.contains(focused) ? Number(focused.dataset.cardIndex) : null;
  return ids.slice(0, pinnedPrefixLength(tops, viewportHeight, focusedIndex));
}

const focusById = (id: string) => {
  const element = document.getElementById(id);
  element?.scrollIntoView();
  element?.focus({ preventScroll: true });
};

/**
 * /anime/<year>/<season>, the whole page below the layout (a client root, so
 * the static ISR HTML holds the banner and the first 12 cards). Page 1 comes
 * from the server; pages 2+ load from the browser one at a time, right after
 * hydration. Cards on screen keep their place when a later page arrives, and
 * a Great Sage divider offers a re-sort when shows below air sooner. A stale
 * ISR render refreshes page 1 from the browser (seasonFreshness.ts). One
 * sr-only status line speaks for the page. CLAUDE.md §5.1.
 */
export default function PageBase({
  year,
  season,
  initialMedia,
  initialHasNextPage,
  initialCarryOver,
  initialCarryOverIncluded,
  initialCarryOverCapped,
  fetchedAt,
}: PageBaseProps) {
  preconnect("https://s4.anilist.co");
  preconnect(BROWSER_ANILIST_URL, { crossOrigin: "anonymous" });

  const { sort, setSort, showContinuing, setShowContinuing, hiddenFormats, toggleFormat, showAllFormats } =
    useContext(HeaderContext);
  const label = seasonLabelOf(year, season);
  const win = useMemo(() => seasonWindow(year, season), [year, season]);
  const compareCountdown = useMemo(() => countdownComparator(win), [win]);

  // Page-1 data: the server's, or this session's newer browser refresh of it
  // (see seasonFreshness.ts — back/forward replays the original payload).
  const seasonKey = `${year}-${season}`;
  const [seed] = useState(() => {
    const recalled = recallRefresh(seasonKey, fetchedAt);
    if (recalled) return { ...recalled, carryOverIncluded: true };
    return {
      at: fetchedAt,
      media: initialMedia,
      carryOver: initialCarryOver,
      carryOverIncluded: initialCarryOverIncluded,
      carryOverCapped: initialCarryOverCapped,
      hasNextPage: initialHasNextPage,
    };
  });

  // Every fetched show, deduped, in popularity (fetch) order. Everything shown is derived from it.
  const [media, setMedia] = useState(() => appendUnique([], seed.media));
  const [cursor, setCursor] = useState({ nextPage: 2, hasNextPage: seed.hasNextPage });
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [carryOver, setCarryOver] = useState(seed.carryOver);
  const [carryOverIncluded, setCarryOverIncluded] = useState(seed.carryOverIncluded);
  const [carryOverCapped, setCarryOverCapped] = useState(seed.carryOverCapped);
  /** When the page-1 data was fetched (later pages are newer). */
  const [dataAt, setDataAt] = useState(seed.at);
  /**
   * A later page failed to load: the popularity floor on continuing series
   * lifts for good, so the count in the heading and chip is what's shown.
   */
  const [laterPageFailed, setLaterPageFailed] = useState(false);
  /** A later page repeated a loaded show: AniList's order moved, so one may have been skipped. */
  const [orderShifted, setOrderShifted] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [announcement, setAnnouncement] = useState({ text: "", count: 0 });
  /** Re-announces identical lines too (MyList's pattern). Stable, so fetchMore is too. */
  const announce = useCallback((text: string) => setAnnouncement((current) => ({ text, count: current.count + 1 })), []);

  /** Later pages are still to come (the popularity floor's condition). */
  const floorPending = cursor.hasNextPage && !laterPageFailed;
  // Continuing series and the popularity floor come from every loaded show; the format
  // filter applies after, so hiding a format never holds continuing series back.
  const continuingAll = useMemo(
    () => selectContinuing({ carryOver, media, showContinuing, sort, hasNextPage: floorPending }),
    [carryOver, media, showContinuing, sort, floorPending]
  );
  const listedMedia = useMemo(() => filterByFormat(media, hiddenFormats), [media, hiddenFormats]);
  const continuing = useMemo(() => filterByFormat(continuingAll, hiddenFormats), [continuingAll, hiddenFormats]);
  const continuingIds = useMemo(() => new Set(continuing.map((item) => item.id)), [continuing]);

  // Cards on screen keep their place when later pages arrive; those pages are
  // sorted in *behind* them (a strict re-sort would reshuffle the cards being
  // read). Changing the sort or the continuing toggle re-sorts everything.
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  // Format chips reset the pins themselves, and only when a press changes what's listed (onFormat).
  const view = `${sort}|${showContinuing}`;
  const [pinnedForView, setPinnedForView] = useState(view);
  if (pinnedForView !== view) {
    setPinnedForView(view);
    setPinnedIds([]);
  }
  /** Ids on screen as of the last render (read when a page arrives). */
  const visibleIds = useRef<number[]>([]);
  /** Every loaded season id (the order-drift check). */
  const mediaIdsRef = useRef<Set<number>>(new Set());
  const gridRef = useRef<HTMLOListElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  // Guards: one request at a time, and never a page that already loaded
  // (an observer holding an older fetchMore can fire before the re-render).
  const busy = useRef(false);
  const loadedThrough = useRef(1);

  const fetchMore = useCallback(
    async ({ origin = "scroll", flush = false }: { origin?: "eager" | "scroll" | "retry"; flush?: boolean } = {}) => {
      const page = cursor.nextPage;
      if (busy.current || !cursor.hasNextPage || page <= loadedThrough.current) return false;

      busy.current = true;
      setStatus("loading");
      // Scroll-origin fetches start only when every loaded card is revealed: the reader is waiting.
      if (origin === "scroll") announce(STATUS.loadingMore(label));
      const result = await getAniListData({ page, year, season });
      busy.current = false;

      if (!result.ok) {
        setStatus("error");
        setLaterPageFailed(true);
        if (origin !== "eager") announce(STATUS.loadFailed(label));
        return false;
      }
      const shifted = result.media.some((item) => mediaIdsRef.current.has(item.id));
      const pins =
        PIN_SCOPE === "revealed"
          ? visibleIds.current
          : pinnedOnScreenIds(gridRef.current, visibleIds.current, window.innerHeight);
      const apply = () => {
        loadedThrough.current = page;
        setPinnedIds(pins);
        // Browser-fetched pages are fresher than the (possibly old) server data,
        // so they also update shows already in the list.
        setMedia((current) => mergeFresh(current, result.media));
        setCursor({ nextPage: page + 1, hasNextPage: result.hasNextPage });
        setStatus("idle");
        if (shifted) setOrderShifted(true);
      };
      if (flush) flushSync(apply);
      else apply();
      if (origin !== "eager") announce(STATUS.loadedMore(label));
      return true;
    },
    [cursor, year, season, announce, label]
  );

  // The page may be a cached (ISR) render from a while ago: the first visit
  // after a quiet spell gets the last render while Next rebuilds it. If the
  // data is over 10 minutes old, or the server's request fell back without
  // continuing series, re-fetch page 1 + continuing series from the browser
  // right away (one AniList request, queued before later pages).
  useEffect(() => {
    const stale = isStale(seed.at, Date.now());
    if (!stale && seed.carryOverIncluded) return;
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
      // Stale and not scrolled yet: re-sort (the stale countdown order is wrong
      // anyway); scrolled: keep the revealed cards where they are. Fresh data
      // that only lacked continuing series: pin like a later page does.
      setPinnedIds(
        stale
          ? window.scrollY > 50
            ? visibleIds.current
            : []
          : PIN_SCOPE === "revealed"
            ? visibleIds.current
            : pinnedOnScreenIds(gridRef.current, visibleIds.current, window.innerHeight)
      );
      // Before page 2 has loaded (the usual case: the queue runs this first),
      // page 1 is replaced outright, so shows that left it don't linger stale.
      const onlyPageOne = loadedThrough.current === 1;
      setMedia((current) => (onlyPageOne ? appendUnique([], result.media) : mergeFresh(current, result.media)));
      if (result.carryOverIncluded) {
        setCarryOver(result.carryOver);
        setCarryOverIncluded(true);
        setCarryOverCapped(result.carryOverCapped);
      }
      setCursor((current) => (current.nextPage === 2 ? { ...current, hasNextPage: result.hasNextPage } : current));
      const at = Date.now();
      setDataAt(at);
      announce(stale ? STATUS.refreshed : STATUS.continuingLoaded);
      rememberRefresh(seasonKey, {
        at,
        media: result.media,
        carryOver: result.carryOver,
        carryOverCapped: result.carryOverCapped,
        hasNextPage: result.hasNextPage,
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [seed, seasonKey, year, season, announce]);

  // Load the rest of the season right away (not on scroll), so the order
  // behind the pinned cards and the counts are complete before the reader
  // gets there.
  useEffect(() => {
    if (!EAGER_SORTS.includes(sort) || !cursor.hasNextPage || status !== "idle") return;
    if (cursor.nextPage > MAX_EAGER_PAGE) return;
    const timer = setTimeout(() => void fetchMore({ origin: "eager" }), 0);
    return () => clearTimeout(timer);
  }, [sort, cursor, status, fetchMore]);

  const { list: sorted, pinnedCount } = useMemo(
    () => orderSeason({ media: listedMedia, continuing, sort, pinnedIds, compareCountdown }),
    [listedMedia, continuing, sort, pinnedIds, compareCountdown]
  );

  const { visibleCount, hasMore, sentinelRef, revealAtLeast } = useLazyLoad({
    total: sorted.length,
    canFetchMore: cursor.hasNextPage && status !== "error" && !retrying,
    fetchMore,
  });

  useEffect(() => {
    visibleIds.current = sorted.slice(0, visibleCount).map((item) => item.id);
    mediaIdsRef.current = new Set(media.map((item) => item.id));
  });

  const { openDetails, sheet } = useAnimeDetails({ Action: CARD_LAYOUT.Action, fallbackFocusId: "season-shows-title" });

  // Facts about the season (all clock-free). Claims about the season ("no shows here")
  // use every loaded show; what's listed uses the format filter.
  /** Season shows loaded, in every format. */
  const N = media.length;
  /** Season shows listed (formats not hidden). */
  const n = listedMedia.length;
  /** Season shows in hidden formats. */
  const hidden = N - n;
  const counts = useMemo(() => formatCounts(media), [media]);
  const carryOverAll = useMemo(() => {
    const seasonIds = new Set(media.map((item) => item.id));
    return carryOver.filter((item) => !seasonIds.has(item.id));
  }, [carryOver, media]);
  /** Continuing series in this season (before the popularity floor); 0 when they didn't load. */
  const c = carryOverIncluded ? carryOverAll.length : 0;
  /** Of those, the ones in shown formats (all of them, or none while TV is hidden). */
  const cByFormat = carryOverIncluded ? filterByFormat(carryOverAll, hiddenFormats).length : 0;
  /** TV is hidden, so the continuing series (all TV) can't be listed whatever their toggle says. */
  const tvBlocksContinuing = cByFormat < c;
  /** …and the toggle is on: they'd be listed but for TV. */
  const continuingHiddenWithTv = showContinuing && tvBlocksContinuing;
  const loaded = useMemo(() => [...media, ...carryOverAll], [media, carryOverAll]);
  const complete = !cursor.hasNextPage;
  const exact = complete && !orderShifted;
  const empty = complete && N === 0 && c === 0;
  const onlyContinuing = complete && N === 0 && c > 0;
  /** Shows exist, but the format filter lists none of them: a panel above the (empty) grid. */
  const formatsHideAll = !empty && sorted.length === 0 && (hidden > 0 || continuingHiddenWithTv);
  /** No season shows and the continuing ones are hidden: the grid is replaced by a panel. */
  const nothingListed = !formatsHideAll && onlyContinuing && !showContinuing;
  /** Every season show is in a hidden format, but continuing series are listed. */
  const formatsOnlyContinuing = N > 0 && n === 0 && continuing.length > 0;
  // From every loaded show: Pause live timers must not come and go with a format chip.
  const hasCountdowns = loaded.some((item) => nextAiring(item) !== null);
  // The format row, once shown, stays for the page's life (no chip unmounts under its own press);
  // a season with no season shows still gets it while a format is hidden, so TV can be shown again.
  const [formatRowShown, setFormatRowShown] = useState(false);
  const wantFormatRow = N > 0 || hiddenFormats.length > 0;
  if (wantFormatRow && !formatRowShown) setFormatRowShown(true);
  // With nothing listed (formats hide everything) the hint stays, so the chips under it never move.
  const anyInSeason = (sorted.length ? sorted : loaded).some(
    (item) => inSeasonAiringAt(item, win) !== Number.POSITIVE_INFINITY
  );
  const dividerK = sort === "countdown" && pinnedCount > 0 ? soonerBelow(sorted, pinnedCount, win) : 0;
  const allFetchedVisible = visibleCount >= sorted.length;
  // The error row stays up while its Retry runs (the focused button keeps focus and says "Retrying…").
  const waiting = status === "loading" && allFetchedVisible && !retrying;
  const showLoadError = allFetchedVisible && (status === "error" || retrying);
  const showEndCard = complete && !hasMore && status !== "error" && sorted.length > 0;

  const onSort = (mode: SortMode) => {
    if (mode === sort) return;
    setSort(mode);
    announce(STATUS.sorted(mode));
  };
  /** A format chip: the status line says what's listed after it (computed now, not from the next render). */
  const onFormat = (key: FormatKey) => {
    const next = toggledFormats(hiddenFormats, key);
    const nextN = filterByFormat(media, next).length;
    const nextContinuing = filterByFormat(continuingAll, next);
    toggleFormat(key);
    // A re-sort like the continuing toggle's, but only when the list changes ("Music 0" changes nothing).
    if (nextN !== n || nextContinuing.length !== continuing.length) setPinnedIds([]);
    announce(
      STATUS.formats({
        key,
        shown: !next.includes(key),
        label,
        n: nextN,
        c: nextContinuing.length,
        complete,
        tvContinuing: Math.abs(nextContinuing.length - continuing.length),
      })
    );
  };
  /** The panel's "Show every format" unmounts: focus the heading (or the continuing panel's button). */
  const showAllFromPanel = () => {
    flushSync(() => {
      showAllFormats();
      setPinnedIds([]);
    });
    if (document.getElementById("season-shows-title")) focusById("season-shows-title");
    else document.getElementById("season-show-continuing")?.focus();
    announce(STATUS.formats({ key: null, shown: true, label, n: media.length, c: continuingAll.length, complete }));
  };
  const onContinuing = (on: boolean) => {
    // The count that will actually render (popularity mode can still hold some back).
    const shown = on
      ? selectContinuing({ carryOver, media, showContinuing: true, sort, hasNextPage: floorPending }).length
      : 0;
    setShowContinuing(on);
    announce(STATUS.continuing(on, shown, label));
  };
  const showContinuingFromPanel = () => {
    const shown = selectContinuing({ carryOver, media, showContinuing: true, sort, hasNextPage: floorPending }).length;
    // The panel's button unmounts: move focus to the heading that replaces it.
    flushSync(() => setShowContinuing(true));
    focusById("season-shows-title");
    announce(STATUS.continuing(true, shown, label));
  };
  const resort = () => {
    flushSync(() => setPinnedIds([]));
    focusById("season-shows-title");
    announce(STATUS.resorted);
  };
  const backToTop = useCallback(() => focusById("season-title"), []);
  const jumpToShows = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // An explicit scroll, not the fragment: no history entry without router state (tempest-theme rule 7).
    // Modified clicks still open a new tab.
    if (!isPlainClick(event) || !document.getElementById("season-shows-title")) return;
    event.preventDefault();
    focusById("season-shows-title");
  }, []);
  const retry = async () => {
    if (retrying) return;
    const hadFocus = document.activeElement === retryRef.current;
    const firstNew = sorted.length;
    setRetrying(true);
    const ok = await fetchMore({ origin: "retry", flush: hadFocus });
    setRetrying(false);
    if (!ok || !hadFocus) return;
    // Keyboard users continue from the first new show.
    flushSync(() => revealAtLeast(firstNew + REVEAL_CHUNK));
    const first = gridRef.current?.querySelector<HTMLElement>(`li[data-card-index="${firstNew}"] [data-card-title]`);
    (first ?? document.getElementById("season-shows-title"))?.focus();
  };

  const renderCard = (item: AnimeMedia, index: number) => (
    <li
      key={item.id}
      data-card-index={index}
      data-media-id={item.id}
      // Server-rendered cards never animate (no LCP delay); later ones rise in.
      className={`flex min-w-0 ${index >= REVEAL_CHUNK ? "animate-[rise-in_400ms_ease-out_both]" : ""}`}
    >
      <Card
        media={item}
        Action={CARD_LAYOUT.Action}
        continuing={continuingIds.has(item.id)}
        onOpenDetails={openDetails}
        coverSizes={CARD_LAYOUT.seasonCoverSizes}
        eager={index < CARD_LAYOUT.eager}
        priority={index < CARD_LAYOUT.priority}
      />
    </li>
  );
  // One keyed array (cards + the divider at the seam): a card that crosses the
  // seam when pins change keeps its DOM node, focus and state.
  const gridItems = sorted.slice(0, visibleCount).map((item, index) => renderCard(item, index));
  if (dividerK > 0 && pinnedCount < sorted.length) {
    gridItems.splice(
      Math.min(pinnedCount, visibleCount),
      0,
      <OrderDivider key="order-divider" k={dividerK} onResort={resort} />
    );
  }
  /**
   * Cards after the last full-width row (the re-sort divider), with every
   * card revealed: where the end card and the waiting skeletons fall.
   */
  const cellsInLastBlock = sorted.length - (gridItems.length > visibleCount ? pinnedCount : 0);
  const showsHeading = onlyContinuing ? "Continuing series" : `${label} shows`;
  const continuingShown = showContinuing && cByFormat > 0;

  return (
    // Not focusable: after a client navigation Next focuses the new page's
    // first element, and SeasonNav has already put focus where it belongs.
    <div className="flex min-w-0 flex-col text-white">
      <SeasonBanner
        year={year}
        season={season}
        clockFallback={seed.at}
        loaded={loaded}
        displayed={sorted}
        complete={complete}
        loadFailed={status === "error"}
        empty={empty}
        // Kept while the formats list nothing (its fixed-height card says so), so the page never shifts.
        showsListed={!nothingListed}
        nothingInFormats={formatsHideAll}
        carryOverIncluded={carryOverIncluded}
        onJumpToShows={jumpToShows}
      />

      <div className={`${APP_CONTAINER} flex flex-col gap-6 [contain:inline-size]`}>
        {empty ? (
          <EmptySeasonPanel year={year} season={season} clockFallback={seed.at} carryOverIncluded={carryOverIncluded} />
        ) : (
          <>
            <SeasonControls
              year={year}
              season={season}
              clockFallback={seed.at}
              continuingCount={c}
              continuingCapped={carryOverCapped}
              continuingNeedsTv={tvBlocksContinuing}
              carryOverIncluded={carryOverIncluded}
              hasCountdowns={hasCountdowns}
              anyInSeason={anyInSeason}
              showHint={!nothingListed}
              formats={formatRowShown || wantFormatRow ? { counts, exact } : null}
              onSort={onSort}
              onContinuing={onContinuing}
              onContinuingNeedsTv={() => announce(STATUS.continuingNeedsTv(showContinuing))}
              onFormat={onFormat}
            />
            {nothingListed ? (
              <ContinuingHiddenPanel
                year={year}
                season={season}
                clockFallback={seed.at}
                count={c}
                capped={carryOverCapped}
                onShow={showContinuingFromPanel}
              />
            ) : (
              <section
                id="season-shows"
                aria-labelledby="season-shows-title"
                className="flex min-w-0 scroll-mt-20 flex-col gap-4"
              >
                <h2
                  id="season-shows-title"
                  tabIndex={-1}
                  className={`${SECTION_TITLE_CLASS} scroll-mt-20 focus:outline-none`}
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#95ccff]" />
                  {showsHeading}
                  <span aria-hidden="true" className="font-mono text-sm font-normal tabular-nums text-[rgb(164,164,164)]">
                    {onlyContinuing ? (cByFormat ? continuingLabel(cByFormat, carryOverCapped) : "0") : countLabel(n, exact)}
                    {!onlyContinuing && continuingShown && (
                      <span className="hidden sm:inline">{` · ${continuingLabel(cByFormat, carryOverCapped)} continuing`}</span>
                    )}
                    {/* At every width: on phones the hidden chips may be scrolled out of view. */}
                    {onlyContinuing
                      ? continuingHiddenWithTv && ` · ${continuingLabel(c, carryOverCapped)} hidden`
                      : hiddenLabel(hidden, exact)}
                  </span>
                  <span className="sr-only">
                    {onlyContinuing
                      ? continuingHiddenWithTv
                        ? `: 0; ${spokenContinuing(c, carryOverCapped)} more in hidden formats`
                        : `: ${spokenContinuing(c, carryOverCapped)}`
                      : headingSr({ n, exact, c: cByFormat, capped: carryOverCapped, showContinuing, hidden })}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px min-w-8 flex-1 bg-gradient-to-r from-[#95ccff]/30 to-transparent"
                  />
                </h2>
                {onlyContinuing && !formatsHideAll && (
                  <OnlyContinuingNote year={year} season={season} clockFallback={seed.at} />
                )}
                {formatsHideAll && (
                  <FormatsHiddenPanel
                    label={label}
                    n={N}
                    exact={exact}
                    formats={hiddenWithShows(counts, hiddenFormats)}
                    cHidden={continuingHiddenWithTv || !showContinuing ? c : 0}
                    capped={carryOverCapped}
                    onShowAll={showAllFromPanel}
                  />
                )}
                {formatsOnlyContinuing && <FormatsHiddenNote label={label} exact={exact} onShowAll={showAllFromPanel} />}

                <ol ref={gridRef} role="list" className={CARD_LAYOUT.grid}>
                  {gridItems}
                  {hasMore && (
                    <li ref={sentinelRef} aria-hidden="true" className="js-only flex min-w-0">
                      <Skeleton />
                    </li>
                  )}
                  {waiting &&
                    // The rest of the sentinel's row at each breakpoint (the divider starts a fresh row).
                    CARD_LAYOUT.waitingSkeletons(cellsInLastBlock).map((classes, index) => (
                      <li key={index} aria-hidden="true" className={`${classes} min-w-0`}>
                        <Skeleton />
                      </li>
                    ))}
                  {showLoadError && (
                    <LoadMoreError
                      label={label}
                      shown={sorted.length}
                      retrying={retrying}
                      onRetry={retry}
                      retryRef={retryRef}
                    />
                  )}
                  {showEndCard && (
                    <SeasonEndCard
                      year={year}
                      season={season}
                      clockFallback={seed.at}
                      {...endCardText({
                        label,
                        n: N,
                        c,
                        capped: carryOverCapped,
                        orderShifted,
                        showContinuing,
                        carryOverIncluded,
                        hidden,
                        hiddenFormats: hiddenWithShows(counts, hiddenFormats),
                        continuingHiddenWithTv,
                      })}
                      note={endCardNote(dataAt, orderShifted)}
                      onBackToTop={backToTop}
                      // Poster phones (2 columns): an odd last row has a free cell.
                      spanClassName={CARD_LAYOUT.endCardSpan(cellsInLastBlock % 2 === 1)}
                    />
                  )}
                </ol>
                {(sorted.length > REVEAL_CHUNK || cursor.hasNextPage) && (
                  // After the list: <noscript> isn't a valid <ol> child.
                  <noscript>
                    <p className={`text-sm ${SOFT_TEXT}`}>
                      {noscriptText(Math.min(REVEAL_CHUNK, sorted.length))}{" "}
                      <a href={anilistSeasonUrl(year, season)} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
                        See all of {label} on AniList ↗
                      </a>
                    </p>
                  </noscript>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <p role="status" className="sr-only">
        {announcement.text}
        {announcement.count % 2 ? "​" : ""}
      </p>
      {sheet}
    </div>
  );
}
