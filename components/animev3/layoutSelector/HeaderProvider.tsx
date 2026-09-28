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
}

const HeaderContext = createContext<HeaderContextValue>({
  sort: "countdown",
  setSort: () => {},
});

function HeaderProvider({ children }: { children: ReactNode }) {
  const [sort, setSort] = useState<SortMode>("countdown");
  const value = useMemo(() => ({ sort, setSort }), [sort]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export { HeaderProvider, HeaderContext };
