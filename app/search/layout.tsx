import SearchStatus from "./SearchStatus";

/**
 * /search's shell: full width (the page draws its banner and containers) and
 * the page's one live region, which persists across searches (q and page
 * re-key the page segment, not this layout).
 *
 * min-w-0 + [contain:inline-size]: nothing inside can widen the body grid's
 * single auto column (CLAUDE.md §9.13). That, not the nav, is what made
 * /search scroll sideways at 390px and below (an <input>'s default width).
 */
export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="search" className="min-w-0 w-full overflow-x-clip pb-8 text-white [contain:inline-size]">
      {children}
      <SearchStatus />
    </main>
  );
}
