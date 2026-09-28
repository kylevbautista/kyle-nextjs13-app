"use client";
import { createContext, ReactNode, useMemo, useState } from "react";

/** How the season grid is ordered. Lives in the /anime layout so it survives season changes. */
export type SortMode = "countdown" | "popularity";

export const SORT_LABELS: Record<SortMode, string> = {
  countdown: "By Countdown",
  popularity: "By Popularity",
};

interface HeaderContextValue {
  sort: SortMode;
  setSort: (sort: SortMode) => void;
  /** Include series continuing from earlier seasons (lib/anime/carryOver.ts). */
  showContinuing: boolean;
  setShowContinuing: (show: boolean) => void;
}

const HeaderContext = createContext<HeaderContextValue>({
  sort: "countdown",
  setSort: () => {},
  showContinuing: true,
  setShowContinuing: () => {},
});

function HeaderProvider({ children }: { children: ReactNode }) {
  const [sort, setSort] = useState<SortMode>("countdown");
  const [showContinuing, setShowContinuing] = useState(true);
  const value = useMemo(
    () => ({ sort, setSort, showContinuing, setShowContinuing }),
    [sort, showContinuing]
  );
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export { HeaderProvider, HeaderContext };
