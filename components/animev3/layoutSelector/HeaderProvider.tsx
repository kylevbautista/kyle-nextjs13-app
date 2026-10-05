"use client";
import { createContext, ReactNode, useCallback, useMemo, useState } from "react";
import type { SortMode } from "@/lib/anime/seasonOrder";
import { toggleFormat as toggled, type FormatKey } from "@/lib/anime/seasonFormats";

/**
 * The season pages' session view state, in the /anime layout so it survives season changes. The
 * sort isn't here: it's remembered per browser (season/seasonSortStore.ts, lib/seasonSort.ts).
 */
export type { SortMode };

interface HeaderContextValue {
  /** Include series continuing from earlier seasons (lib/anime/carryOver.ts). */
  showContinuing: boolean;
  setShowContinuing: (show: boolean) => void;
  /**
   * Formats the reader hid (lib/anime/seasonFormats.ts), in canonical order.
   * The hidden set, not the shown one, so a format new to a season shows.
   */
  hiddenFormats: readonly FormatKey[];
  toggleFormat: (key: FormatKey) => void;
  showAllFormats: () => void;
}

const NO_FORMATS: readonly FormatKey[] = [];

const HeaderContext = createContext<HeaderContextValue>({
  showContinuing: true,
  setShowContinuing: () => {},
  hiddenFormats: NO_FORMATS,
  toggleFormat: () => {},
  showAllFormats: () => {},
});

/** Session state only: the static ISR HTML renders the defaults (every format, continuing series on). */
function HeaderProvider({ children }: { children: ReactNode }) {
  const [showContinuing, setShowContinuing] = useState(true);
  const [hiddenFormats, setHiddenFormats] = useState<readonly FormatKey[]>(NO_FORMATS);
  const toggleFormat = useCallback((key: FormatKey) => setHiddenFormats((current) => toggled(current, key)), []);
  const showAllFormats = useCallback(() => setHiddenFormats(NO_FORMATS), []);
  const value = useMemo(
    () => ({ showContinuing, setShowContinuing, hiddenFormats, toggleFormat, showAllFormats }),
    [showContinuing, hiddenFormats, toggleFormat, showAllFormats]
  );
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export { HeaderProvider, HeaderContext };
