"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import AniListCover from "@/components/theme/AniListCover";
import { nextAiring } from "@/lib/anime/airing";
import type { TempestEntry } from "@/lib/landing";
import { searchPath } from "@/lib/routes";
import CountdownText from "./CountdownText";
import LandingAddButton from "./LandingAddButton";
import { useLanding } from "./LandingProvider";
import { FOCUS_RING } from "./SageLine";

/** Gap between cards (gap-4), so a timeline segment reaches the next dot. */
const GAP_PX = 16;
const LINE_FROM = [0x95, 0xcc, 0xff];
const LINE_TO = [0xc4, 0xb5, 0xfd];

/** The timeline color at position t (0…1) along #95ccff → #c4b5fd. */
function lineColor(t: number) {
  const [r, g, b] = LINE_FROM.map((from, i) => Math.round(from + (LINE_TO[i] - from) * t));
  return `rgb(${r},${g},${b})`;
}

/**
 * The Tensura franchise, oldest first, on a scroll-snap shelf under a
 * timeline. Upcoming entries get "+ Plan to Watch". With the static fallback
 * (no full snapshots) every card links to search instead: a partial snapshot
 * of a finished show would never be repaired by the list refresh.
 */
export default function TempestShelf({ entries, live }: { entries: TempestEntry[]; live: boolean }) {
  const { media } = useLanding();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const regionId = useId();

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const start = scroller.scrollLeft <= 2;
      const end = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    scroller.addEventListener("scroll", schedule, { passive: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resize?.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", schedule);
      resize?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollByCards = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector("li");
    const width = card ? card.getBoundingClientRect().width : 160;
    scroller.scrollBy({ left: direction * 2 * (width + GAP_PX), behavior: "smooth" });
  };

  const mask =
    edges.start && edges.end
      ? ""
      : edges.start
        ? "[-webkit-mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]"
        : edges.end
          ? "[-webkit-mask-image:linear-gradient(to_right,transparent,#000_32px)] [mask-image:linear-gradient(to_right,transparent,#000_32px)]"
          : "[-webkit-mask-image:linear-gradient(to_right,transparent,#000_32px,#000_calc(100%-32px),transparent)] [mask-image:linear-gradient(to_right,transparent,#000_32px,#000_calc(100%-32px),transparent)]";

  const last = Math.max(1, entries.length - 1);

  return (
    <div className="relative">
      <div className="mb-3 hidden justify-end gap-2 sm:flex">
        <ArrowButton
          direction={-1}
          disabled={edges.start}
          controls={regionId}
          onClick={() => scrollByCards(-1)}
        />
        <ArrowButton
          direction={1}
          disabled={edges.end}
          controls={regionId}
          onClick={() => scrollByCards(1)}
        />
      </div>

      <div
        ref={scrollerRef}
        id={regionId}
        role="region"
        aria-label="Tensura seasons and movies, oldest first"
        tabIndex={0}
        className={`snap-x snap-mandatory scroll-px-1 overflow-x-auto rounded-lg [scrollbar-color:rgba(149,204,255,.35)_transparent] [scrollbar-width:thin] ${mask} ${FOCUS_RING}`}
      >
        <ul className="flex gap-4 px-1 pb-4 pt-1">
          {entries.map((entry, index) => {
            const next = entries[index + 1];
            const from = lineColor(index / last);
            const to = lineColor((index + 1) / last);
            const dashed = next?.upcoming ?? false;
            const full = media(entry.id);
            const airing = entry.status === "RELEASING" && full ? nextAiring(full) : null;
            return (
              <li key={entry.id} className="flex w-[150px] shrink-0 snap-start flex-col sm:w-[170px]">
                {/* Timeline: the season label over a dot, joined by a line that is
                    solid through released entries and dashed into upcoming ones. */}
                <div aria-hidden="true" className="relative mb-3 h-8">
                  <span
                    className={`absolute left-0 top-0 whitespace-nowrap font-mono text-[11px] leading-4 ${
                      entry.upcoming ? "text-violet-300" : "text-[rgb(164,164,164)]"
                    }`}
                  >
                    {entry.seasonLabel ?? "TBA"}
                  </span>
                  {next && (
                    <span
                      className="absolute left-1 top-[23px] h-0.5"
                      style={{
                        right: -GAP_PX,
                        backgroundImage: dashed
                          ? `repeating-linear-gradient(90deg,${from} 0 6px,transparent 6px 10px)`
                          : `linear-gradient(90deg,${from},${to})`,
                      }}
                    />
                  )}
                  <span
                    className={`absolute left-0 top-[19px] h-2.5 w-2.5 rounded-full ring-4 ring-[rgb(18,18,18)] ${
                      entry.upcoming
                        ? "bg-violet-400 shadow-[0_0_10px_2px_rgba(167,139,250,.6)]"
                        : "bg-[#95ccff]"
                    }`}
                  />
                </div>

                <ShelfCard
                  entry={entry}
                  addable={live && full !== null}
                  airingAt={airing?.airingAt ?? null}
                  airingEpisode={airing?.episode ?? null}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ShelfCard({
  entry,
  addable,
  airingAt,
  airingEpisode,
}: {
  entry: TempestEntry;
  addable: boolean;
  airingAt: number | null;
  airingEpisode: number | null;
}) {
  const titleId = useId();
  const meta =
    entry.formatLabel === "Movie"
      ? "Movie"
      : [entry.formatLabel, entry.episodes ? `${entry.episodes} eps` : null].filter(Boolean).join(" · ");

  let status: ReactNode;
  if (entry.upcoming) {
    status = (
      <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
        Coming {entry.seasonLabel ?? "soon"}
      </span>
    );
  } else if (entry.status === "RELEASING") {
    status =
      airingAt !== null ? (
        <span className="text-[11px] font-semibold text-[#95ccff]">
          <CountdownText airingAt={airingAt} episode={airingEpisode} mode="chip" />
        </span>
      ) : (
        <span className="text-[11px] font-semibold text-[#95ccff]">Airing</span>
      );
  } else if (entry.status === "FINISHED") {
    status = <span className="text-[11px] text-[rgb(164,164,164)]">Finished</span>;
  } else if (entry.status === "HIATUS") {
    status = <span className="text-[11px] text-[rgb(164,164,164)]">On hiatus</span>;
  } else {
    status = null;
  }

  return (
    <article
      aria-labelledby={titleId}
      className={`flex flex-1 flex-col overflow-hidden rounded-xl border bg-[rgb(30,30,30)] ${
        entry.upcoming
          ? "border-[#95ccff]/50 shadow-[0_0_30px_-6px_#95ccff] ring-2 ring-[#95ccff]/60"
          : "border-[rgb(53,53,53)]"
      }`}
    >
      <div
        className="relative aspect-[2/3] w-full bg-[rgb(38,38,38)]"
        style={entry.color ? { backgroundColor: entry.color } : undefined}
      >
        <AniListCover
          urls={[entry.coverUrl, entry.coverUrlXL]}
          sizes="(min-width: 640px) 170px, 150px"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 id={titleId} className="line-clamp-2 text-sm font-semibold leading-5 text-white">
          {entry.shortLabel}
          {entry.fullTitle !== entry.shortLabel && <span className="sr-only">, {entry.fullTitle}</span>}
        </h3>
        <p className="text-xs text-[rgb(164,164,164)]">
          {entry.seasonLabel && <span className="sr-only">{entry.seasonLabel} · </span>}
          {meta}
        </p>
        <div className="min-h-[20px]">{status}</div>
        <div className="mt-auto pt-1">
          {addable ? (
            <LandingAddButton
              id={entry.id}
              status={entry.upcoming ? "planning" : undefined}
              label={entry.upcoming ? "+ Plan to Watch" : undefined}
              location="tempest"
            />
          ) : (
            <Link
              href={searchPath(entry.romaji)}
              prefetch={false}
              className="flex h-11 w-full items-center justify-center rounded-lg border border-[#95ccff]/40 bg-white/5 text-xs font-bold text-[#e6f3ff] transition-colors hover:bg-white/10 md:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
            >
              Find it<span className="sr-only">: {entry.fullTitle}</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function ArrowButton({
  direction,
  disabled,
  controls,
  onClick,
}: {
  direction: 1 | -1;
  disabled: boolean;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction < 0 ? "Scroll archive left" : "Scroll archive right"}
      aria-controls={controls}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#95ccff]/30 bg-white/5 text-[#cfe8ff] transition-colors hover:bg-white/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:hover:bg-white/5 ${FOCUS_RING}`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {direction < 0 ? <path d="M12.5 4.5L7 10l5.5 5.5" /> : <path d="M7.5 4.5L13 10l-5.5 5.5" />}
      </svg>
    </button>
  );
}
