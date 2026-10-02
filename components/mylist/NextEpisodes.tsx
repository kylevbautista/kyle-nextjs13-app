"use client";
import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import CountdownText from "@/components/home/CountdownText";
import { FOCUS_RING_PANEL } from "@/components/theme/tokens";
import { useMinuteNow } from "@/components/utils/useMinuteNow";
import { formatAirDate, nextAiring } from "@/lib/anime/airing";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";
import { AIRED_GRACE_SECONDS } from "@/lib/landing";

const ROWS = 3;

const CARD =
  "hidden h-[276px] w-full flex-col overflow-hidden rounded-2xl border border-[#95ccff]/20 bg-[rgb(30,30,30)]/95 shadow-[0_24px_60px_-24px_rgba(93,174,241,.45)] sm:flex sm:max-w-[520px] lg:max-w-none";

/**
 * The landing hero's "Next episodes" card (components/home/HeroNextUp.tsx),
 * fed by a page's shows: the 3 soonest episodes, ticking live. A card from
 * 640px and a one-row ticker below that, both jumping to the page's full view
 * (the Airing Schedule's week panel, the season page's grid). The jumps are
 * next/link, not plain "#" links: a native fragment entry has no router
 * state, so a later Back would change the URL without changing the page.
 * Rows that aired more than 30 minutes ago drop out on the per-minute clock.
 *
 * `entries` must be sorted soonest first and all have a next episode.
 */
export default function NextEpisodes({
  entries,
  jump,
  restingText = "Those episodes just aired. The next ones appear as soon as AniList schedules them.",
  headerNote = "Pacific Time",
  loading = false,
}: {
  entries: readonly AnimeMedia[];
  /** The footer link and the ticker: `label` is shown, `srLabel` ends the ticker's name. */
  jump: {
    href: string;
    label: string;
    srLabel: string;
    /** Runs first (the links still jump without JS). */
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  };
  /** Shown when no row is left. */
  restingText?: string;
  headerNote?: string;
  /** The rows aren't known yet: skeleton rows, and no ticker. */
  loading?: boolean;
}) {
  const now = useMinuteNow();
  const nowSeconds = now === null ? null : Math.floor(now / 1000);
  const rows = entries
    .filter((entry) => {
      const next = nextAiring(entry);
      return next && (nowSeconds === null || next.airingAt > nowSeconds - AIRED_GRACE_SECONDS);
    })
    .slice(0, ROWS);
  const first = rows[0];
  const firstNext = first ? nextAiring(first) : null;

  return (
    <>
      <section aria-labelledby="next-up-title" className={CARD}>
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[rgb(53,53,53)] px-4 font-mono text-xs">
          <h2 id="next-up-title" className="font-semibold text-[#cfe8ff]">
            <span className="sr-only">Great Sage notice: </span>
            <span aria-hidden="true" className="mr-1.5 text-[#95ccff]">
              《Notice》
            </span>
            Next episodes
          </h2>
          <span className="text-[rgb(164,164,164)]">{headerNote}</span>
        </header>
        {loading ? (
          <ol aria-hidden="true" className="flex flex-1 flex-col divide-y divide-[rgb(53,53,53)]">
            {Array.from({ length: ROWS }, (_, index) => (
              <SkeletonRow key={index} />
            ))}
          </ol>
        ) : rows.length ? (
          <ol className="flex flex-1 flex-col divide-y divide-[rgb(53,53,53)]">
            {rows.map((entry) => (
              <NextUpRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[rgb(164,164,164)]">
            {restingText}
          </p>
        )}
        <footer className="flex h-11 shrink-0 items-center border-t border-[rgb(53,53,53)] px-2">
          <Link
            href={jump.href}
            onClick={jump.onClick}
            className={`flex h-9 items-center rounded-md px-2 text-sm font-medium text-[#95ccff] hover:bg-white/5 hover:text-white ${FOCUS_RING_PANEL}`}
          >
            {jump.label} <span aria-hidden="true">&nbsp;↓</span>
          </Link>
        </footer>
      </section>

      {/* Below 640px: a one-row ticker. */}
      {!loading && first && firstNext && (
        <Link
          href={jump.href}
          onClick={jump.onClick}
          aria-label={`Next up: ${displayTitle(first)}, ${
            firstNext.episode ? `episode ${firstNext.episode}` : "next episode"
          }, airs ${formatAirDate(firstNext.airingAt)}. ${jump.srLabel}`}
          className={`flex h-14 w-full items-center gap-2.5 overflow-hidden rounded-2xl border border-[#95ccff]/20 bg-[rgb(30,30,30)]/95 px-3 text-sm sm:hidden ${FOCUS_RING_PANEL}`}
        >
          <span className="flex w-0 min-w-0 flex-1 flex-col">
            <span className="font-mono text-[10px] font-semibold uppercase leading-4 tracking-wider text-[#95ccff]">
              Next up
            </span>
            <span className="truncate font-semibold leading-5 text-white">{displayTitle(first)}</span>
          </span>
          <span className="shrink-0 text-[13px] font-semibold text-[#95ccff]">
            <CountdownText airingAt={firstNext.airingAt} episode={firstNext.episode} mode="row" seconds={false} />
          </span>
        </Link>
      )}
    </>
  );
}

function SkeletonRow() {
  return (
    <li className="flex min-h-0 flex-1 animate-pulse items-center gap-3 px-4">
      <div className="h-14 w-10 shrink-0 rounded-md bg-[rgb(53,53,53)]" />
      <div className="flex w-0 min-w-0 flex-1 flex-col gap-2">
        <span className="h-3.5 w-3/4 rounded bg-[rgb(53,53,53)]" />
        <span className="h-3.5 w-1/2 rounded bg-[rgb(53,53,53)]" />
      </div>
    </li>
  );
}

function NextUpRow({ entry }: { entry: AnimeMedia }) {
  const next = nextAiring(entry);
  const title = displayTitle(entry);
  const cover = entry.coverImage?.medium ?? entry.coverImage?.large;
  return (
    <li className="flex min-h-0 flex-1 items-center gap-3 px-4">
      <div
        className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
        style={entry.coverImage?.color ? { backgroundColor: entry.coverImage.color } : undefined}
      >
        {cover && (
          <Image src={cover} alt="" width={40} height={56} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex w-0 min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-white" title={title}>
          {title}
        </p>
        {next && (
          <p className="text-sm font-semibold text-[#95ccff]">
            <CountdownText airingAt={next.airingAt} episode={next.episode} mode="row" />
          </p>
        )}
      </div>
    </li>
  );
}
