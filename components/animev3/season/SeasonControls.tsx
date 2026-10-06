"use client";
import { memo, useContext, useState } from "react";
import { SageTag } from "@/components/home/SageLine";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import { revealInRow } from "@/components/theme/revealInRow";
import { FOCUS_RING_PANEL, LABEL_CLASS, PANEL, SHELF, SHELF_OFF, SHELF_ON } from "@/components/theme/tokens";
import {
  CONTINUING_TITLE,
  CONTINUING_TV_HIDDEN_TITLE,
  FORMAT_TITLES,
  continuingLabel,
  formatChipLabel,
  seasonLabelOf,
  sortHint,
  SORT_NAMES,
} from "@/lib/anime/seasonCopy";
import { chipFormats, type FormatCounts, type FormatKey } from "@/lib/anime/seasonFormats";
import type { SortMode } from "@/lib/anime/seasonOrder";
import type { SeasonName } from "@/lib/season";
import { HeaderContext } from "../layoutSelector/HeaderProvider";
import { useSeasonPhase } from "./useSeasonPhase";

const SORTS: SortMode[] = ["countdown", "popularity"];

/** A chip whose action is blocked (the continuing series while TV is hidden): dashed, quiet, still focusable. */
const BLOCKED_CHIP = `${SHELF} cursor-default border-dashed border-[#95ccff]/40 text-[rgb(164,164,164)] ${FOCUS_RING_PANEL}`;

/**
 * The season page's controls (JavaScript only): sort by countdown or
 * popularity, the continuing-series toggle with its count, "Pause live
 * timers", a line saying what the current order means, and the format chips
 * (every AniList format, each an on/off toggle with its count). The toggle
 * and hidden formats live in HeaderContext (app/anime/layout.tsx), so they
 * survive season navigation; the sort is remembered per browser
 * (seasonSortStore.ts) and comes in resolved. The handlers come from
 * PageBase, which speaks the change.
 */
export default function SeasonControls({
  year,
  season,
  sort,
  clockFallback,
  continuingCount,
  continuingCapped,
  continuingNeedsTv,
  carryOverIncluded,
  hasCountdowns,
  anyInSeason,
  showHint,
  formats,
  onSort,
  onContinuing,
  onContinuingNeedsTv,
  onFormat,
}: {
  year: number;
  season: SeasonName;
  /** The resolved sort (PageBase: this tab's pick, else the order the page was rendered in). */
  sort: SortMode;
  clockFallback: number;
  /** Continuing series known to the page (0 when they didn't load). */
  continuingCount: number;
  continuingCapped: boolean;
  /** TV is hidden, so the continuing series (all TV) can't be listed. */
  continuingNeedsTv: boolean;
  carryOverIncluded: boolean;
  /** Some show on the page has a live countdown (the timers toggle). */
  hasCountdowns: boolean;
  /** Some shown show has its next episode in this season (the countdown hint). */
  anyInSeason: boolean;
  /** False when nothing is listed (there's no order to explain). */
  showHint: boolean;
  /** The format chips' counts (season shows per format); null for a season with no season shows. */
  formats: { counts: FormatCounts; exact: boolean } | null;
  onSort: (mode: SortMode) => void;
  onContinuing: (on: boolean) => void;
  onContinuingNeedsTv: () => void;
  onFormat: (key: FormatKey) => void;
}) {
  const { showContinuing, hiddenFormats } = useContext(HeaderContext);
  const chip = (on: boolean) => `${SHELF} ${on ? SHELF_ON : SHELF_OFF} ${FOCUS_RING_PANEL}`;
  const chips = formats ? chipFormats(formats.counts, hiddenFormats) : [];
  // Other, once shown, stays for the page's life: no chip unmounts under its own press.
  const [otherSeen, setOtherSeen] = useState(false);
  if (!otherSeen && chips.includes("OTHER")) setOtherSeen(true);
  if (otherSeen && formats && !chips.includes("OTHER")) chips.push("OTHER");

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
            continuingCount > 0 &&
            (continuingNeedsTv ? (
              // Kept in place (no reflow under a finger): a press says why nothing changes.
              <button
                type="button"
                aria-pressed={showContinuing}
                aria-disabled="true"
                onClick={onContinuingNeedsTv}
                title={CONTINUING_TV_HIDDEN_TITLE(showContinuing)}
                className={BLOCKED_CHIP}
              >
                <span aria-hidden="true">{showContinuing ? "✓" : "+"}</span>
                Continuing<span className="max-sm:hidden"> series</span>
                <span className="font-mono tabular-nums">{continuingLabel(continuingCount, continuingCapped)}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-pressed={showContinuing}
                onClick={() => onContinuing(!showContinuing)}
                title={CONTINUING_TITLE}
                className={chip(showContinuing)}
              >
                <span aria-hidden="true">{showContinuing ? "✓" : "+"}</span>
                Continuing<span className="max-sm:hidden"> series</span>
                <span className="font-mono tabular-nums">{continuingLabel(continuingCount, continuingCapped)}</span>
              </button>
            ))
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
      {formats && (
        // Phones: the label above a full-width scrolling row (a scrolled chip never clips against it).
        <div className="flex min-w-0 flex-col gap-1 border-t border-[rgb(53,53,53)] pt-2.5 sm:flex-row sm:items-start sm:gap-2 sm:pt-2">
          <span id="season-format-label" className={`${LABEL_CLASS} shrink-0 max-[359px]:sr-only sm:mt-[1.125rem] md:mt-3.5`}>
            Formats<span className="sr-only"> shown</span>
          </span>
          {/* Phones: one row that scrolls sideways (My List's shelves); from 640px it wraps. */}
          <div role="group" aria-labelledby="season-format-label" className="min-w-0 flex-1">
            <ul className="flex gap-1.5 py-1 max-sm:-mx-1 max-sm:overflow-x-auto max-sm:scroll-pr-10 max-sm:px-1 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,#000_85%,transparent)] max-sm:[scrollbar-width:none] sm:flex-wrap">
              {chips.map((key) => {
                const shown = !hiddenFormats.includes(key);
                return (
                  <li key={key} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={shown}
                      title={FORMAT_TITLES[key]}
                      onClick={(event) => {
                        onFormat(key);
                        revealInRow(event.currentTarget);
                      }}
                      onFocus={(event) => revealInRow(event.currentTarget)}
                      className={chip(shown)}
                    >
                      {/* The state survives forced colors (which drop SHELF_ON's fill and ring). */}
                      <span aria-hidden="true">{shown ? "✓" : "+"}</span>
                      {formatChipLabel(key)}
                      {/* A count's box is the same width loaded or not (0–99): the row never rewraps when later
                          pages land. The lower-bound "+" sits in the chip's padding, outside the layout. */}
                      <span className="relative inline-block min-w-[2ch] text-left font-mono tabular-nums">
                        {formats.counts[key]}
                        {!formats.exact && <span className="absolute left-full">+</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
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
