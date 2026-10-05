"use client";
import { memo, useMemo, type MouseEvent } from "react";
import NextEpisodes from "@/components/mylist/NextEpisodes";
import {
  NEXT_UP_NONE_IN_FORMATS,
  nextUpResting,
  nextUpRows,
  seasonLabelOf,
  seasonSageLine,
  seasonSubScope,
} from "@/lib/anime/seasonCopy";
import { seasonWindow } from "@/lib/anime/seasonOrder";
import type { AnimeMedia } from "@/lib/anime/types";
import { SEASON_MONTHS, type SeasonName } from "@/lib/season";
import SeasonHeader from "./SeasonHeader";
import { useSeasonPhase } from "./useSeasonPhase";

interface SeasonBannerProps {
  year: number;
  season: SeasonName;
  /** The data's fetch time: "now" for SSR and hydration, until the minute clock runs. */
  clockFallback: number;
  /** Every show the page has (season and continuing, whatever the toggle says). */
  loaded: readonly AnimeMedia[];
  /** The shows on screen, in order (the aside's rows come from these). */
  displayed: readonly AnimeMedia[];
  /** Every page has loaded. */
  complete: boolean;
  /** A later page failed to load. */
  loadFailed: boolean;
  empty: boolean;
  /** False when nothing is listed below (continuing-only season, toggle off). */
  showsListed: boolean;
  /** The format chips list nothing: the Next-episodes card stays (same height) and says so. */
  nothingInFormats: boolean;
  carryOverIncluded: boolean;
  /** "The whole season ↓": scroll to the grid's heading and focus it. */
  onJumpToShows: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * The banner, a per-minute clock leaf: the phase (upcoming / current / past)
 * picks the Great Sage line, the sub's scope and the season tiles' window.
 * Current and upcoming seasons get the Next-episodes card from 1024px, with
 * rows only once every page has loaded (a later page can hold the soonest
 * episode), or "Loaded shows only" after a load error.
 */
function SeasonBanner({
  year,
  season,
  clockFallback,
  loaded,
  displayed,
  complete,
  loadFailed,
  empty,
  showsListed,
  nothingInFormats,
  carryOverIncluded,
  onJumpToShows,
}: SeasonBannerProps) {
  const { nowMs: clock, phase: clockPhase } = useSeasonPhase(year, season, clockFallback);
  // Never null here: the fallback is a number.
  const nowMs = clock ?? clockFallback;
  const phase = clockPhase ?? "current";
  const label = seasonLabelOf(year, season);
  const { from, to } = SEASON_MONTHS[season];
  const sage = seasonSageLine({ year, season, loaded, nowMs, empty });
  const win = useMemo(() => seasonWindow(year, season), [year, season]);
  const rows = useMemo(() => nextUpRows(displayed, win, nowMs), [displayed, win, nowMs]);

  const aside =
    // Its rows and resting text describe "the shows below": only when some are listed.
    !empty && showsListed && phase !== "past" ? (
      <NextEpisodes
        entries={rows}
        loading={!complete && !loadFailed}
        headerNote={loadFailed && !complete ? "Loaded shows only" : undefined}
        restingText={nothingInFormats ? NEXT_UP_NONE_IN_FORMATS : nextUpResting(phase, label)}
        jump={{ href: "#season-shows", label: "The whole season", srLabel: "See the whole season", onClick: onJumpToShows }}
      />
    ) : undefined;

  return (
    <SeasonHeader
      year={year}
      season={season}
      sage={sage}
      sageKey={sage.text}
      sub={
        <>
          {`${from} – ${to} ${year}. `}
          <span className="hidden sm:inline">{`${seasonSubScope(phase, label, carryOverIncluded)} `}</span>
          Times are Pacific.
        </>
      }
      nowMs={nowMs}
      phase={phase}
      showCurrent
      aside={aside}
      // Without JavaScript an unfinished card would show skeleton rows forever.
      asideClassName={`hidden lg:block${complete ? "" : " js-only"}`}
    />
  );
}

export default memo(SeasonBanner);
