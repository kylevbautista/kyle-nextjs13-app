"use client";
import Link from "next/link";
import {
  SEASON_LABELS,
  SEASON_MONTHS,
  SeasonName,
  seasonPath,
  shiftSeason,
} from "@/lib/season";
import { SORT_LABELS, SortMode } from "./HeaderProvider";

interface HeaderSelectorProps {
  year: number;
  season: SeasonName;
  /** The season airing right now. */
  current: { year: number; season: SeasonName };
  /** Years that have a season page. */
  yearRange: { min: number; max: number };
  sort: SortMode;
  setSort: (sort: SortMode) => void;
  showContinuing: boolean;
  setShowContinuing: (show: boolean) => void;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

const seasonLabel = ({ year, season }: { year: number; season: SeasonName }) =>
  `${SEASON_LABELS[season]} ${year}`;

const ARROW_PATHS = {
  prev: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  next: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
};

function SeasonArrow({
  direction,
  target,
  enabled,
}: {
  direction: "prev" | "next";
  target: { year: number; season: SeasonName };
  enabled: boolean;
}) {
  const icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="34px"
      height="34px"
      aria-hidden="true"
    >
      <path d={ARROW_PATHS[direction]}></path>
    </svg>
  );

  if (!enabled) {
    // Keeps the title centered; there is no page beyond the valid year range.
    return (
      <span className="rounded-full fill-[rgb(80,80,80)]" aria-hidden="true">
        {icon}
      </span>
    );
  }

  const label = `${direction === "prev" ? "Previous" : "Next"} season: ${seasonLabel(target)}`;
  return (
    <Link
      href={seasonPath(target.year, target.season)}
      aria-label={label}
      title={label}
      className={`rounded-full fill-[rgb(149,204,255)] hover:bg-[rgb(53,53,53)] ${FOCUS_RING}`}
    >
      {icon}
    </Link>
  );
}

export function HeaderSelector({
  year,
  season,
  current,
  yearRange,
  sort,
  setSort,
  showContinuing,
  setShowContinuing,
}: HeaderSelectorProps) {
  const prev = shiftSeason(year, season, -1);
  const next = shiftSeason(year, season, 1);
  const { from, to } = SEASON_MONTHS[season];
  const isCurrent = current.year === year && current.season === season;

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-y-3 laptop:justify-between">
      <div className="flex flex-wrap items-end justify-center gap-5 text-white">
        <div className="flex basis-full items-center justify-center gap-3 sm:flex-initial">
          <SeasonArrow direction="prev" target={prev} enabled={prev.year >= yearRange.min} />
          <div className="flex flex-col">
            <p className="text-xs text-[rgb(164,164,164)]">{`${from} – ${to} ${year}`}</p>
            <h1 className="text-2xl sm:text-4xl">{`${seasonLabel({ year, season })} Anime`}</h1>
          </div>
          <SeasonArrow direction="next" target={next} enabled={next.year <= yearRange.max} />
        </div>

        <div
          role="group"
          aria-label="Sort and filter anime"
          className="flex basis-full flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:flex-initial"
        >
          {(["popularity", "countdown"] as const).map((mode) => {
            const active = sort === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => setSort(mode)}
                className={`flex h-[44px] items-center rounded-sm border-b px-1 ${FOCUS_RING} ${
                  active
                    ? "border-blue-500 font-bold text-blue-500"
                    : "border-transparent text-[rgb(164,164,164)] hover:border-blue-500 hover:text-white"
                }`}
              >
                {SORT_LABELS[mode]}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={showContinuing}
            onClick={() => setShowContinuing(!showContinuing)}
            title="Series that started in an earlier season and are still airing"
            className={`flex h-[32px] items-center gap-1 rounded-full border px-3 text-sm ${FOCUS_RING} ${
              showContinuing
                ? "border-blue-500 bg-blue-600/20 text-[#95ccff]"
                : "border-[rgb(53,53,53)] text-[rgb(164,164,164)] hover:border-blue-500 hover:text-white"
            }`}
          >
            <span aria-hidden="true">{showContinuing ? "✓" : "+"}</span>
            Continuing series
          </button>
        </div>
      </div>

      <div className="flex h-[40px] w-[350px] items-center justify-between gap-3 rounded-lg bg-[rgb(38,38,38)] p-2">
        <p className="font-bold">{`Sorted: ${SORT_LABELS[sort]}`}</p>
        {isCurrent ? (
          <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-xs font-bold text-[#95ccff]">
            Airing this season
          </span>
        ) : (
          <Link
            href={seasonPath(current.year, current.season)}
            aria-label={`Go to the current season, ${seasonLabel(current)}`}
            className={`rounded-sm text-sm text-[#95ccff] hover:underline ${FOCUS_RING}`}
          >
            Current season →
          </Link>
        )}
      </div>
      <div className="w-full border-b border-[rgb(38,38,38)]"></div>
    </div>
  );
}
