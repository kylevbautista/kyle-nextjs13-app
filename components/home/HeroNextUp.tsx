"use client";
import Image from "next/image";
import Link from "next/link";
import { formatAirDate, nextAiring } from "@/lib/anime/airing";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";
import { trackLanding } from "./analytics";
import CountdownText from "./CountdownText";
import { useLanding, useVisibleAiring } from "./LandingProvider";
import Slime from "./Slime";

const ROWS = 3;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)]";

type Resting = { text: string; href: string; label: string };

/**
 * Proof above the fold: the next episodes, ticking live. A fixed-height card
 * from 640px (rows are replaced in place, so nothing shifts) and a one-row
 * ticker below that. Rows come from useVisibleAiring, which uses the server's
 * fetch time until hydration, so SSR and hydration render the same rows.
 */
export default function HeroNextUp({ ids }: { ids: number[] }) {
  const { season } = useLanding();
  const rows = useVisibleAiring(ids, ROWS);

  let resting: Resting | null = null;
  if (!rows.length) {
    if (!season) {
      resting = {
        text: "AniList isn't answering right now, so live countdowns are resting.",
        href: "/anime",
        label: "Browse this season",
      };
    } else if (!ids.length) {
      resting = {
        text: "No episodes are scheduled in the next week. Premiere dates are on the season page.",
        href: season.seasonHref,
        label: `Browse ${season.label}`,
      };
    } else {
      resting = {
        text: "Those episodes just aired. Fresh countdowns are on the season page.",
        // In preview, "/anime" is still the ending season: use the page's own link.
        href: season.browseHref,
        label: season.browseLabel,
      };
    }
  }

  const footerLabel = season
    ? `All ${season.showCount ? `${season.showCount} ` : ""}${season.label} countdowns`
    : "All countdowns";
  const trackFooter = () => trackLanding("cta_click", { cta: "browse_season", location: "hero_next_up" });

  return (
    <>
      {/* 640px and up: the card. */}
      <section
        aria-labelledby="next-up-title"
        className="hidden h-[276px] w-full flex-col overflow-hidden rounded-2xl border border-[#95ccff]/20 bg-[rgb(30,30,30)]/95 shadow-[0_24px_60px_-24px_rgba(93,174,241,.45)] sm:flex"
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

        {resting ? (
          <RestingState {...resting} />
        ) : (
          <ol className="flex flex-1 flex-col divide-y divide-[rgb(53,53,53)]">
            {rows.map((media) => (
              <NextUpRow key={media.id} media={media} />
            ))}
          </ol>
        )}

        {!resting && (
          <footer className="flex h-11 shrink-0 items-center border-t border-[rgb(53,53,53)] px-2">
            <a
              href="#airing-next"
              onClick={trackFooter}
              className={`flex h-9 items-center rounded-md px-2 text-sm font-medium text-[#95ccff] hover:bg-white/5 hover:text-white ${FOCUS}`}
            >
              {footerLabel} <span aria-hidden="true">&nbsp;↓</span>
            </a>
          </footer>
        )}
      </section>

      {/* Below 640px: a one-row ticker. */}
      <Ticker first={rows[0] ?? null} resting={resting} onClick={trackFooter} />
    </>
  );
}

function NextUpRow({ media }: { media: AnimeMedia }) {
  const next = nextAiring(media);
  const title = displayTitle(media);
  const cover = media.coverImage.medium ?? media.coverImage.large;
  return (
    <li className="flex min-h-0 flex-1 items-center gap-3 px-4">
      <div
        className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
        style={media.coverImage.color ? { backgroundColor: media.coverImage.color } : undefined}
      >
        {cover && (
          <Image
            src={cover}
            alt=""
            width={40}
            height={56}
            loading="lazy"
            fetchPriority="low"
            className="h-full w-full object-cover"
          />
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

function RestingState({ text, href, label }: Resting) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Slime size={48} mood="worried" />
      <p className="text-sm leading-6 text-[rgb(200,206,218)]">
        <span className="sr-only">Great Sage report: </span>
        <span aria-hidden="true" className="font-mono text-[#95ccff]">
          《Report》{" "}
        </span>
        {text}
      </p>
      <Link
        href={href}
        className={`inline-flex h-11 items-center rounded-xl border border-[#95ccff]/40 bg-white/5 px-4 text-sm font-medium text-[#e6f3ff] hover:bg-white/10 ${FOCUS}`}
      >
        {label}
      </Link>
    </div>
  );
}

function Ticker({
  first,
  resting,
  onClick,
}: {
  first: AnimeMedia | null;
  resting: Resting | null;
  onClick: () => void;
}) {
  const base = `flex h-14 w-full items-center gap-2.5 overflow-hidden rounded-2xl border border-[#95ccff]/20 bg-[rgb(30,30,30)]/95 px-3 text-sm sm:hidden ${FOCUS}`;
  const next = first ? nextAiring(first) : null;

  if (!first || !next || resting) {
    return (
      <Link href={resting?.href ?? "/anime"} className={base}>
        <Slime size={32} mood="worried" animated={false} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[rgb(200,206,218)]">Countdowns are resting</span>
        <span className="shrink-0 font-medium text-[#95ccff]">{resting?.label ?? "Browse this season"}</span>
      </Link>
    );
  }

  const title = displayTitle(first);
  const episode = next.episode ? `episode ${next.episode}` : "next episode";
  return (
    <a
      href="#airing-next"
      onClick={onClick}
      aria-label={`Next up: ${title}, ${episode}, airs ${formatAirDate(next.airingAt)}. See all countdowns`}
      className={base}
    >
      {/* "Next up" stacks over the title so a long countdown can't squeeze it out. */}
      <span className="flex w-0 min-w-0 flex-1 flex-col">
        <span className="font-mono text-[10px] font-semibold uppercase leading-4 tracking-wider text-[#95ccff]">
          Next up
        </span>
        <span className="truncate font-semibold leading-5 text-white">{title}</span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-[#95ccff]">
        <CountdownText airingAt={next.airingAt} episode={next.episode} mode="row" seconds={false} />
      </span>
    </a>
  );
}
