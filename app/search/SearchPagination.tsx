"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { SageLine } from "@/components/home/SageLine";
import { GHOST_BUTTON } from "@/components/theme/tokens";
import { rememberSearchFocus, type SearchFocusTarget } from "@/components/utils/searchArrival";
import { capNote, pageLabel } from "@/lib/anime/searchCopy";
import { searchResultsPath, type ResultWindow, type SearchFilters } from "@/lib/search";

/**
 * A link to another results page (with the same filters, or `filters` to
 * change them): never prefetched (each page is an AniList request), and it
 * leaves the arrival token so the new page focuses its Results h2, or its h1
 * for `target="title"` (onNavigate: not on modified clicks, not on Back/Forward).
 */
export function SearchPageLink({
  query,
  page,
  filters,
  target = "list",
  className,
  children,
}: {
  query: string;
  page: number;
  filters: SearchFilters;
  target?: SearchFocusTarget;
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={searchResultsPath(query, page, filters)}
      prefetch={false}
      onNavigate={() => rememberSearchFocus(target, query, page, filters)}
      className={className}
    >
      {children}
    </Link>
  );
}

/**
 * The owner's pager: ← Previous · Page N · Next →, the same ghost style on
 * both. Phones: the label on its own row, the two buttons under it (three
 * cells need ~340px). No numbered pages: AniList's lastPage is false on
 * title search (lib/search.ts).
 */
export default function SearchPagination({
  query,
  filters,
  results,
}: {
  query: string;
  filters: SearchFilters;
  results: ResultWindow;
}) {
  const note = capNote(results, filters);
  if (!results.hasPrevious && results.nextPage === null) return null;
  return (
    <div className="flex flex-col items-center gap-4">
      <nav
        aria-label="Search result pages"
        className="grid w-full grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4"
      >
        {/* DOM order = desktop order; on phones the label is placed on row 1. */}
        <div className="flex justify-start sm:justify-end">
          {results.hasPrevious && (
            <SearchPageLink query={query} page={results.page - 1} filters={filters} className={`${GHOST_BUTTON} max-sm:w-full`}>
              <span aria-hidden="true">←</span>
              Previous<span className="sr-only"> page (page {results.page - 1})</span>
            </SearchPageLink>
          )}
        </div>
        <p className="col-span-2 row-start-1 text-center font-mono text-sm tabular-nums text-[#95ccff] sm:col-span-1 sm:row-start-auto">
          {pageLabel(results)}
        </p>
        <div className="flex justify-end sm:justify-start">
          {results.nextPage !== null && (
            <SearchPageLink query={query} page={results.nextPage} filters={filters} className={`${GHOST_BUTTON} max-sm:w-full`}>
              Next<span className="sr-only"> page (page {results.nextPage})</span>
              <span aria-hidden="true">→</span>
            </SearchPageLink>
          )}
        </div>
      </nav>
      {note && (
        <SageLine kind="Report" size="sm">
          {note}
        </SageLine>
      )}
    </div>
  );
}
