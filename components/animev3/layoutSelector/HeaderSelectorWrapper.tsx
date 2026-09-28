"use client";
import { useContext } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { HeaderContext } from "./HeaderProvider";
import { HeaderSelector } from "./HeaderSelector";
import {
  SeasonName,
  getCurrentSeason,
  seasonRouteRedirect,
  validYearRange,
} from "@/lib/season";

interface HeaderSelectorWrapperProps {
  /** Server render time (ms), so server and client agree on the current season and year range. */
  renderedAt: number;
}

/**
 * Season header for /anime/<year>/<season>. It lives in app/anime/layout.tsx
 * and reads the season straight from the child route segments, so it is
 * correct on the first server render and updates the moment a navigation
 * commits.
 */
export function HeaderSelectorWrapper({ renderedAt }: HeaderSelectorWrapperProps) {
  const { sort, setSort, showContinuing, setShowContinuing } = useContext(HeaderContext);
  // The [...anime] catch-all shows up as one "2026/fall" segment.
  const parts = useSelectedLayoutSegments().flatMap((segment) => segment.split("/"));
  const now = new Date(renderedAt);

  // Not a valid season (e.g. /anime while it redirects): render nothing.
  if (parts.length === 0 || seasonRouteRedirect(parts, now) !== null) return null;

  return (
    <div className="flex flex-col items-center justify-center text-white sm:px-4 sm:pt-4">
      <HeaderSelector
        year={Number(parts[0])}
        season={parts[1] as SeasonName}
        current={getCurrentSeason(now)}
        yearRange={validYearRange(now)}
        sort={sort}
        setSort={setSort}
        showContinuing={showContinuing}
        setShowContinuing={setShowContinuing}
      />
    </div>
  );
}
