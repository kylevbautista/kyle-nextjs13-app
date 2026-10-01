"use client";
import { useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  dedupeByMalId,
  getTopAnimeJinkan,
  type TopAnimeItem,
  type TopAnimePage,
} from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import { SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import { TrophyIcon } from "@/components/theme/icons";
import {
  CONSOLE_PANEL,
  FOCUS_RING,
  PRIMARY_BUTTON,
  QUIET_BUTTON,
  SECTION_TITLE_CLASS,
} from "@/components/theme/tokens";
import {
  consoleLine,
  loadedAnnouncement,
  malRankingUrl,
  octagramBlurb,
  rangeSpoken,
  rangeText,
  rankRange,
  splitOctagram,
  titleLinkId,
} from "./ranking";
import { initialRankingState, saveRankingSnapshot } from "./rankingStore";
import { RowSkeleton, TopAnimeRow } from "./TopAnimeRow";

/** Posters loaded right away (the rest wait until they're near the viewport). */
const EAGER_POSTERS = 4;

/**
 * The ranking: the Octagram (ranks 1–8), then everything after, and a Great
 * Sage console that loads the next page. Page 1 comes from the server; later
 * pages come from Jikan in the browser, one at a time (in-flight guard,
 * dedupe, inline Retry). Loaded pages survive a Back from "Track"
 * (rankingStore). Root element places itself in TopAnimeShell's grid.
 */
export default function TopAnimeList({ initialPage }: { initialPage: TopAnimePage }) {
  const [initial] = useState(() => initialRankingState(initialPage));
  const { key } = initial;
  const [items, setItems] = useState(initial.items);
  const [lastPage, setLastPage] = useState(initial.lastPage);
  const [hasNextPage, setHasNextPage] = useState(initial.hasNextPage);
  // Rows present at mount (server-rendered or restored) never animate.
  const [animateFrom] = useState(initial.items.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inFlightRef = useRef(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const errorId = useId();

  const { octagram, rest } = useMemo(() => splitOctagram(items), [items]);
  const indexOf = useMemo(() => new Map(items.map((item, index) => [item.malId, index])), [items]);
  const restRange = useMemo(() => rankRange(rest), [rest]);

  const loadMore = async () => {
    // Guards double clicks (and clicks while aria-disabled) from loading one page twice.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setAnnouncement("Loading more of the ranking…");
    try {
      const nextPage = lastPage + 1;
      const result = await getTopAnimeJinkan({ page: nextPage, isClient: true });
      if (!result.ok) {
        setError(result.error);
        setAnnouncement(""); // the role=alert message speaks instead
        return;
      }
      const merged = dedupeByMalId(items, result.page.items);
      const added = merged.slice(items.length);
      const end = !result.page.hasNextPage;
      const hadFocus = document.activeElement === moreRef.current;
      flushSync(() => {
        setItems(merged);
        setLastPage(nextPage);
        setHasNextPage(result.page.hasNextPage);
        setAnnouncement(loadedAnnouncement(added, merged.length, end));
      });
      saveRankingSnapshot({ key, items: merged, lastPage: nextPage, hasNextPage: result.page.hasNextPage });
      if (hadFocus) {
        // Keyboard users continue from the first new show; at the end, from the console.
        const first = added[0] ? document.getElementById(titleLinkId(added[0].malId)) : null;
        if (first) first.focus();
        else if (!moreRef.current) consoleRef.current?.focus();
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  const backToTop = () => {
    const title = document.getElementById("top-anime-title");
    title?.scrollIntoView();
    title?.focus({ preventScroll: true });
  };

  const renderRow = (item: TopAnimeItem) => {
    const index = indexOf.get(item.malId) ?? 0;
    return (
      <TopAnimeRow
        key={item.malId}
        item={item}
        eager={index < EAGER_POSTERS}
        appended={index >= animateFrom}
      />
    );
  };

  const mood = error ? "worried" : loading ? "sage" : !hasNextPage ? "happy" : "idle";

  return (
    <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-1">
      {octagram.length > 0 && (
        <section aria-labelledby="octagram-title" className="relative isolate flex min-w-0 flex-col gap-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-64 bg-[radial-gradient(closest-side,rgba(245,196,81,.08),transparent)]"
          />
          <h2 id="octagram-title" className={SECTION_TITLE_CLASS}>
            <TrophyIcon className="h-5 w-5 shrink-0" />
            The Octagram
            <span aria-hidden="true" className="font-mono text-sm font-normal tabular-nums text-[rgb(164,164,164)]">
              #1–#8
            </span>
            <span className="sr-only">, ranks 1 to 8</span>
            <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[rgb(200,206,218)] sm:text-base">{octagramBlurb(octagram)}</p>
          <ol role="list" className="flex list-none flex-col gap-3">
            {octagram.map(renderRow)}
          </ol>
        </section>
      )}

      <section aria-labelledby="ranking-title" className="flex min-w-0 flex-col gap-4">
        <h2 id="ranking-title" className={SECTION_TITLE_CLASS}>
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#95ccff]" />
          The ranking
          {restRange && (
            <>
              <span aria-hidden="true" className="font-mono text-sm font-normal tabular-nums text-[rgb(164,164,164)]">
                {rangeText(restRange)}
              </span>
              <span className="sr-only">, {rangeSpoken(restRange)}</span>
            </>
          )}
          <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-gradient-to-r from-[#95ccff]/30 to-transparent" />
        </h2>

        {rest.length > 0 && (
          <ol role="list" className="flex list-none flex-col gap-3">
            {rest.map(renderRow)}
          </ol>
        )}

        {loading && (
          <div aria-hidden="true" className="flex flex-col gap-3">
            <RowSkeleton />
            <RowSkeleton />
          </div>
        )}

        <div
          ref={consoleRef}
          tabIndex={-1}
          className={`${CONSOLE_PANEL} mt-2 flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:gap-5 sm:p-6 sm:text-left ${FOCUS_RING}`}
        >
          <Slime size={56} mood={mood} className="shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="font-mono text-[13px] leading-5 text-[#cfe8ff] sm:text-sm">
              <SageTag kind={loading ? "Analyze" : "Report"} />
              {consoleLine({ items, loading, lastPage, hasNextPage })}
            </p>
            {error && (
              <p
                id={errorId}
                role="alert"
                className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-100"
              >
                <SageTag kind="Warning" />
                {error}
              </p>
            )}
          </div>
          {hasNextPage && (
            <>
              <button
                ref={moreRef}
                type="button"
                onClick={loadMore}
                aria-disabled={loading || undefined}
                aria-describedby={error ? errorId : undefined}
                className={`js-only ${PRIMARY_BUTTON} w-full sm:w-auto sm:min-w-[10rem]`}
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {loading ? "Loading…" : error ? "Retry" : "Show more"}
              </button>
              <noscript>
                <a
                  href={malRankingUrl(items.length)}
                  className={`inline-flex min-h-11 items-center text-sm text-[#95ccff] underline-offset-2 hover:underline ${FOCUS_RING}`}
                >
                  Continue the ranking on MyAnimeList<span aria-hidden="true">&nbsp;↗</span>
                </a>
              </noscript>
            </>
          )}
        </div>

        {/* A button, not a "#" link: a native fragment entry has no router state, so a
            later Back (e.g. from Track) would change the URL without changing the page. */}
        {items.length > initialPage.items.length && (
          <button type="button" onClick={backToTop} className={`${QUIET_BUTTON} self-center`}>
            Back to the top <span aria-hidden="true">↑</span>
          </button>
        )}

        <p role="status" className="sr-only">
          {announcement}
        </p>
      </section>
    </div>
  );
}
