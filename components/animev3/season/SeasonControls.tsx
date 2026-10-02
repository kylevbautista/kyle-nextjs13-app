"use client";
import { memo, useContext } from "react";
import { SageTag } from "@/components/home/SageLine";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import { FOCUS_RING_PANEL, LABEL_CLASS, PANEL, SHELF, SHELF_OFF, SHELF_ON } from "@/components/theme/tokens";
import { continuingLabel, seasonLabelOf, sortHint, SORT_NAMES } from "@/lib/anime/seasonCopy";
import type { SortMode } from "@/lib/anime/seasonOrder";
import type { SeasonName } from "@/lib/season";
import { HeaderContext } from "../layoutSelector/HeaderProvider";
import { useSeasonPhase } from "./useSeasonPhase";

const SORTS: SortMode[] = ["countdown", "popularity"];

/**
 * The season page's controls (JavaScript only): sort by countdown or
 * popularity, the continuing-series toggle with its count, "Pause live
 * timers", and a line saying what the current order means. Sort and toggle
 * live in HeaderContext (app/anime/layout.tsx), so they survive season
 * navigation; the handlers come from PageBase, which speaks the change.
 */
export default function SeasonControls({
  year,
  season,
  clockFallback,
  continuingCount,
  continuingCapped,
  carryOverIncluded,
  hasCountdowns,
  anyInSeason,
  showHint,
  onSort,
  onContinuing,
}: {
  year: number;
  season: SeasonName;
  clockFallback: number;
  /** Continuing series known to the page (0 when they didn't load). */
  continuingCount: number;
  continuingCapped: boolean;
  carryOverIncluded: boolean;
  /** Some show on the page has a live countdown (the timers toggle). */
  hasCountdowns: boolean;
  /** Some shown show has its next episode in this season (the countdown hint). */
  anyInSeason: boolean;
  /** False when nothing is listed (there's no order to explain). */
  showHint: boolean;
  onSort: (mode: SortMode) => void;
  onContinuing: (on: boolean) => void;
}) {
  const { sort, showContinuing } = useContext(HeaderContext);
  const chip = (on: boolean) => `${SHELF} ${on ? SHELF_ON : SHELF_OFF} ${FOCUS_RING_PANEL}`;

  return (
    <section aria-label="Sort and filter" className={`${PANEL} js-only flex flex-col gap-3 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-labelledby="season-sort-label" className="flex items-center gap-2">
          <span id="season-sort-label" className={`${LABEL_CLASS} max-[359px]:sr-only`}>
            Sort by
          </span>
          {SORTS.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={sort === mode}
              onClick={() => onSort(mode)}
              className={chip(sort === mode)}
            >
              {SORT_NAMES[mode]}
            </button>
          ))}
        </div>
        {/* The chip (or note) and the timers wrap as a pair: Pause never sits alone on a row. */}
        <div className="flex grow flex-wrap items-center justify-between gap-x-2 gap-y-3 sm:gap-x-3">
          {carryOverIncluded ? (
            continuingCount > 0 && (
              <button
                type="button"
                aria-pressed={showContinuing}
                onClick={() => onContinuing(!showContinuing)}
                title="Series that started in an earlier season"
                className={chip(showContinuing)}
              >
                <span aria-hidden="true">{showContinuing ? "✓" : "+"}</span>
                Continuing<span className="max-sm:hidden"> series</span>
                <span className="font-mono tabular-nums">{continuingLabel(continuingCount, continuingCapped)}</span>
              </button>
            )
          ) : (
            <p className="text-xs text-[rgb(164,164,164)]">
              <SageTag kind="Report" />
              Continuing series didn&apos;t load from AniList.
            </p>
          )}
          {hasCountdowns && <LiveTimersToggle short className="ml-auto" />}
        </div>
      </div>
      {showHint && (
        <SortHint year={year} season={season} clockFallback={clockFallback} sort={sort} anyInSeason={anyInSeason} />
      )}
    </section>
  );
}

/** What the order means; a minute-clock leaf (a season can end while the page is open). */
const SortHint = memo(function SortHint({
  year,
  season,
  clockFallback,
  sort,
  anyInSeason,
}: {
  year: number;
  season: SeasonName;
  clockFallback: number;
  sort: SortMode;
  anyInSeason: boolean;
}) {
  const { phase } = useSeasonPhase(year, season, clockFallback);
  return (
    <p className="text-xs leading-5 text-[rgb(200,206,218)] sm:text-sm">
      {sortHint({ sort, anyInSeason, phase: phase ?? "current", label: seasonLabelOf(year, season) })}
    </p>
  );
});
