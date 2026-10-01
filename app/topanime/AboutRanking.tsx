import Link from "next/link";
import { SageTag } from "@/components/home/SageLine";
import { FOCUS_RING_PANEL, GHOST_BUTTON_PANEL, PANEL } from "@/components/theme/tokens";
import { searchPath } from "@/lib/routes";

/** Where the ranking comes from, what Track does, and the ways out. Sticky beside the list from 1024px. */
export default function AboutRanking() {
  return (
    <aside
      aria-labelledby="about-ranking-title"
      className={`${PANEL} flex min-w-0 flex-col gap-3 p-4 sm:p-5 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1`}
    >
      <h2 id="about-ranking-title" className="text-base font-bold text-white">
        About this ranking
      </h2>
      <p className="text-sm leading-6 text-[rgb(200,206,218)]">
        Ranks, scores and member counts come from MyAnimeList via Jikan. Jikan refreshes each show
        on its own schedule, so a rank can repeat or be skipped here even though MyAnimeList&apos;s
        own ranking doesn&apos;t. This page refreshes at most once an hour.
      </p>
      <p className="text-sm leading-6 text-[rgb(200,206,218)]">
        <SageTag kind="Notice" />
        Track searches AniList for the show; add it to your list from there.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={searchPath()} prefetch={false} className={GHOST_BUTTON_PANEL}>
          Search anime
        </Link>
        <Link href="/anime" className={GHOST_BUTTON_PANEL}>
          Browse this season
        </Link>
      </div>
      <a
        href="https://myanimelist.net/topanime.php"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-11 items-center self-start rounded text-sm text-[#95ccff] underline-offset-2 hover:text-white hover:underline ${FOCUS_RING_PANEL}`}
      >
        MyAnimeList&apos;s full ranking<span aria-hidden="true">&nbsp;↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}
