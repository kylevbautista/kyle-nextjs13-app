import { memo, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TopAnimeItem } from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import Slime from "@/components/home/Slime";
import { CrownIcon, StarIcon } from "@/components/theme/icons";
import { CARD, FOCUS_RING_PANEL } from "@/components/theme/tokens";
import { rememberSearchFocus } from "@/components/utils/searchArrival";
import { searchPath } from "@/lib/routes";
import { normalizeQuery } from "@/lib/search";
import {
  altTitle,
  compactNumber,
  detailsLine,
  displayName,
  exactNumber,
  isOctagram,
  malAnimeUrl,
  rankLabel,
  rankSizeClass,
  titleLinkId,
} from "./ranking";

/*
 * One row of the ranking (rendered by the TopAnimeList client island).
 *
 * A single design for every rank: a rail (rank, then score), the poster,
 * titles and details, then members and Track. The Octagram (ranks 1–8) gets
 * gold: an octagram sigil, a gold-tinted card and poster ring; #1 adds a
 * crown and one sheen across its poster. MAL covers have no color, so the
 * card glow comes from the rank tier.
 */

const GRID =
  "grid-cols-[3rem_3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 p-3 sm:grid-cols-[3.5rem_4rem_minmax(0,1fr)] sm:gap-x-4 sm:p-4 lg:grid-cols-[5rem_5rem_minmax(0,1fr)] lg:gap-x-5 lg:p-5";
const POSTER_WIDTH = "w-14 sm:w-16 lg:w-20";

/** An original two-squares octagram, hard-coded (no trig at render). */
const OCTAGRAM_PATH =
  "M0 -48L14.1 -33.9L33.9 -33.9L33.9 -14.1L48 0L33.9 14.1L33.9 33.9L14.1 33.9L0 48L-14.1 33.9L-33.9 33.9L-33.9 14.1L-48 0L-33.9 -14.1L-33.9 -33.9L-14.1 -33.9Z";

function RankSigil({ rank, crown }: { rank: number; crown: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12 lg:h-[60px] lg:w-[60px] ${
        crown ? "rounded-full shadow-[0_0_18px_-2px_rgba(245,196,81,.7)]" : ""
      }`}
    >
      <svg viewBox="-50 -50 100 100" focusable="false" className="absolute inset-0 h-full w-full">
        <path
          d={OCTAGRAM_PATH}
          fill={crown ? "#f5c451" : "#0a1428"}
          stroke={crown ? "#b8860b" : "#f5c451"}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`relative text-base font-black leading-none tabular-nums sm:text-lg lg:text-2xl ${
          crown ? "text-[#0a1428]" : "text-gold"
        }`}
      >
        {rank}
      </span>
    </span>
  );
}

function MagnifierIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

export const TopAnimeRow = memo(function TopAnimeRow({
  item,
  eager,
  appended,
}: {
  item: TopAnimeItem;
  /** One of the first few posters on the page: load it right away. */
  eager: boolean;
  /** Added by "Show more": rises in. Server-rendered and restored rows don't animate. */
  appended: boolean;
}) {
  const { malId, rank, score, members, imageUrl, title } = item;
  const oct = isOctagram(item);
  const crown = rank === 1;
  const name = displayName(item);
  const alt = altTitle(item);
  const details = detailsLine(item);
  const href = malAnimeUrl(malId);
  const headingId = `top-anime-title-${malId}`;
  const posterRing = crown
    ? "ring-2 ring-gold/70 shadow-[0_0_28px_-6px_rgba(245,196,81,.55)]"
    : oct
      ? "ring-1 ring-gold/50"
      : "ring-1 ring-white/10";

  return (
    <li className={`flex min-w-0 ${appended ? "animate-[rise-in_400ms_ease-out_both]" : ""}`}>
      <article
        aria-labelledby={`${headingId}-rank ${headingId}-name`}
        style={{ "--card-glow": oct ? "rgba(245,196,81,.45)" : "rgba(93,174,241,.55)" } as CSSProperties}
        className={`relative isolate grid w-full min-w-0 grid-rows-[1fr_auto] text-white ${GRID} ${CARD}`}
      >
        {oct && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[linear-gradient(100deg,rgba(245,196,81,.10),transparent_42%)] ring-1 ring-inset ring-gold/20"
          />
        )}

        {/* DOM order is for screen readers (title first); the grid places the rail and poster left. */}
        <div className="col-start-3 row-start-1 flex min-w-0 flex-col gap-1">
          <h3 id={headingId} className="text-[15px] font-semibold leading-5 sm:text-base lg:text-lg lg:leading-6">
            <span id={`${headingId}-rank`} className="sr-only">
              {rankLabel(item)}:{" "}
            </span>
            <a
              id={titleLinkId(malId)}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`line-clamp-3 break-words rounded-sm hover:text-[#95ccff] hover:underline sm:line-clamp-2 ${FOCUS_RING_PANEL}`}
            >
              {/* The tooltip sits on a child span so it isn't read as the link's description too. */}
              <span id={`${headingId}-name`} title={name}>
                {name}
              </span>
              <span className="sr-only"> (opens MyAnimeList in a new tab)</span>
            </a>
          </h3>
          {alt && (
            <p className="truncate text-xs text-[rgb(164,164,164)] sm:text-sm" title={alt}>
              {alt}
            </p>
          )}
          {details && <p className="text-xs text-[rgb(164,164,164)] sm:text-sm">{details}</p>}
        </div>

        <div className="col-start-1 row-span-2 row-start-1 flex min-w-0 flex-col items-center gap-1.5 self-start pt-0.5">
          {crown && <CrownIcon className="h-4 w-5 sm:h-[18px] sm:w-6 lg:h-6 lg:w-8" />}
          {rank === null ? (
            <span aria-hidden="true" className="text-[1.75rem] font-black leading-none text-[rgb(164,164,164)] sm:text-4xl lg:text-5xl">
              —
            </span>
          ) : oct ? (
            <RankSigil rank={rank} crown={crown} />
          ) : (
            <span
              aria-hidden="true"
              className={`whitespace-nowrap font-black leading-none tabular-nums text-[#95ccff] ${rankSizeClass(rank)}`}
            >
              {rank}
            </span>
          )}
          <p className="flex items-center gap-0.5 whitespace-nowrap text-[13px] font-bold leading-none tabular-nums text-white sm:text-sm lg:text-base">
            <StarIcon className={`h-3 w-3 shrink-0 lg:h-3.5 lg:w-3.5 ${oct ? "text-gold" : "text-[#95ccff]"}`} />
            {score !== null ? (
              <>
                <span className="sr-only">MyAnimeList score </span>
                {score.toFixed(2)}
                <span className="sr-only"> out of 10</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">No MyAnimeList score yet</span>
              </>
            )}
          </p>
        </div>

        {/* Same destination as the title link, so it's out of the tab order and hidden from screen readers. */}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden="true"
          className={`relative col-start-2 row-span-2 row-start-1 block aspect-[225/318] self-start overflow-hidden rounded-md bg-[rgb(38,38,38)] ${POSTER_WIDTH} ${posterRing}`}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 80px, (min-width: 640px) 64px, 56px"
              loading={eager ? "eager" : "lazy"}
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center">
              <Slime size={32} animated={false} />
            </span>
          )}
          {crown && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[45%] -translate-x-[130%] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-sheen [animation-delay:600ms] [animation-fill-mode:both]"
            />
          )}
        </a>

        {/* Wraps (Track drops to its own line) rather than cutting "members" off on small phones. */}
        <div className="col-start-3 row-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          {members !== null && (
            <p className="whitespace-nowrap text-xs text-[rgb(164,164,164)] sm:text-sm">
              <span aria-hidden="true">{compactNumber(members)} members</span>
              <span className="sr-only">{exactNumber(members)} MyAnimeList members</span>
            </p>
          )}
          {/* MAL ids can't go on the list directly; the AniList search finds the same show. */}
          <Link
            href={searchPath(title)}
            prefetch={false}
            // /search focuses its results heading on arrival (the token matches what it prints).
            onNavigate={() => rememberSearchFocus("title", normalizeQuery(title), 1)}
            className={`ml-auto inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 md:h-9 ${FOCUS_RING_PANEL}`}
          >
            <MagnifierIcon className="hidden h-4 w-4 sm:block" />
            Track
            <span className="sr-only"> {name}: find it on AniList to add it to your list</span>
          </Link>
        </div>
      </article>
    </li>
  );
});

/** Same grid and box as a row, for pages on their way in. */
export function RowSkeleton() {
  const bar = "animate-pulse rounded-full bg-[rgb(53,53,53)]";
  return (
    <div className={`grid grid-rows-[1fr_auto] rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] ${GRID}`}>
      <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center gap-2 pt-0.5">
        <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
        <div className={`h-3 w-9 ${bar}`} />
      </div>
      <div className={`col-start-2 row-span-2 row-start-1 aspect-[225/318] animate-pulse rounded-md bg-[rgb(38,38,38)] ${POSTER_WIDTH}`} />
      <div className="col-start-3 row-start-1 flex min-w-0 flex-col gap-2">
        <div className={`h-4 w-3/4 ${bar}`} />
        <div className={`h-3 w-1/2 ${bar}`} />
        <div className={`h-3 w-1/3 ${bar}`} />
      </div>
      <div className="col-start-3 row-start-2 flex items-center">
        <div className="ml-auto h-11 w-[4.5rem] animate-pulse rounded-lg bg-white/10 md:h-9" />
      </div>
    </div>
  );
}
