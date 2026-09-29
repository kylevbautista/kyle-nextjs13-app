"use client";
import { useContext } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { HeaderContext } from "./HeaderProvider";
import { HeaderSelector } from "./HeaderSelector";
import { useNow } from "@/components/utils/useNow";
import {
  SeasonName,
  getCurrentSeason,
  isSeasonName,
  validYearRange,
} from "@/lib/season";

interface HeaderSelectorWrapperProps {
  /**
   * Server render time (ms), used until hydration so server and client HTML
   * match; afterwards the real clock takes over (a cached page can predate a
   * season change).
   */
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
  const now = new Date(useNow() ?? renderedAt);

  // Not a season URL (e.g. /anime while it redirects): render nothing. Only the
  // shape is checked: proxy.ts enforces the year window at request time, and a
  // live-clock range check would hide the header of an open page at New Year.
  if (!/^\d{4}$/.test(parts[0] ?? "") || !isSeasonName(parts[1]) || parts.length !== 2) return null;

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
