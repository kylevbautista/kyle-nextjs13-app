"use client";
import { createContext, ReactNode, useMemo, useState } from "react";
import type { SortMode } from "@/lib/anime/seasonOrder";

/** How the season grid is ordered (lib/anime/seasonOrder.ts). Lives in the /anime layout so it survives season changes. */
export type { SortMode };

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
