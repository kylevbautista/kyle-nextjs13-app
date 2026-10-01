"use client";
import Image from "next/image";
import Link from "next/link";
import CountdownText from "@/components/home/CountdownText";
import { FOCUS_RING_PANEL } from "@/components/theme/tokens";
import { useNow } from "@/components/utils/useNow";
import { formatAirDate, nextAiring } from "@/lib/anime/airing";
import { displayTitle, type ListEntry } from "@/lib/anime/types";
import { AIRED_GRACE_SECONDS } from "@/lib/landing";

const ROWS = 3;

/**
 * The landing hero's "Next episodes" card (components/home/HeroNextUp.tsx),
 * fed by a list: its 3 soonest episodes, ticking live. A card from 640px and
 * a one-row ticker below that, both linking to the week panel. The jumps are
 * next/link, not plain "#" links: a native fragment entry has no router
 * state, so a later Back would change the URL without changing the page. Rows that
 * aired more than 30 minutes ago drop out once the clock is live.
 *
 * `entries` must be sorted soonest first and all have a next episode.
 */
export default function NextEpisodes({ entries }: { entries: ListEntry[] }) {
  const now = useNow();
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
      <section
        aria-labelledby="next-up-title"
        className="hidden h-[276px] w-full flex-col overflow-hidden rounded-2xl border border-[#95ccff]/20 bg-[rgb(30,30,30)]/95 shadow-[0_24px_60px_-24px_rgba(93,174,241,.45)] sm:flex sm:max-w-[520px] lg:max-w-none"
      >
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[rgb(53,53,53)] px-4 font-mono text-xs">
          <h2 id="next-up-title" className="font-semibold text-[#cfe8ff]">
            <span className="sr-only">Great Sage notice: </span>
            <span aria-hidden="true" className="mr-1.5 text-[#95ccff]">
              《Notice》
            </span>
            Next episodes
          </h2>
          <span className="text-[rgb(164,164,164)]">Pacific Time</span>
        </header>
        {rows.length ? (
          <ol className="flex flex-1 flex-col divide-y divide-[rgb(53,53,53)]">
            {rows.map((entry) => (
              <NextUpRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[rgb(164,164,164)]">
            Those episodes just aired. The next ones appear as soon as AniList schedules them.
          </p>
        )}
        <footer className="flex h-11 shrink-0 items-center border-t border-[rgb(53,53,53)] px-2">
          <Link
            href="#schedule-panel"
            className={`flex h-9 items-center rounded-md px-2 text-sm font-medium text-[#95ccff] hover:bg-white/5 hover:text-white ${FOCUS_RING_PANEL}`}
          >
            The whole week <span aria-hidden="true">&nbsp;↓</span>
          </Link>
        </footer>
      </section>

      {/* Below 640px: a one-row ticker. */}
      {first && firstNext && (
        <Link
          href="#schedule-panel"
          aria-label={`Next up: ${displayTitle(first)}, ${
            firstNext.episode ? `episode ${firstNext.episode}` : "next episode"
          }, airs ${formatAirDate(firstNext.airingAt)}. See the whole week`}
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

function NextUpRow({ entry }: { entry: ListEntry }) {
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
