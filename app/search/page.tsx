import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { Suspense, cache } from "react";
import { SageLine } from "@/components/home/SageLine";
import { APP_CONTAINER } from "@/components/theme/tokens";
import {
  resultsHeading,
  searchDocumentTitle,
  searchMetadata,
  searchSageLine,
  searchStatus,
} from "@/lib/anime/searchCopy";
import type { AnimeMedia } from "@/lib/anime/types";
import {
  filtersQuery,
  normalizePage,
  normalizeQuery,
  searchKey,
  searchView,
  type SearchFilters,
  type SearchPageParams,
} from "@/lib/search";
import { normalizeFilters, parseFiltersQuery } from "@/lib/searchFilters";
import { validYearRange } from "@/lib/season";
import { AniListError, searchAnime } from "@/server/lib/anilist";
import SearchArrival from "./SearchArrival";
import SearchBanner from "./SearchBanner";
import SearchPagination from "./SearchPagination";
import { NoResultsPanel, PastEndPanel, SearchErrorPanel } from "./SearchPanels";
import SearchPending, { SearchPendingSage } from "./SearchPending";
import SearchResults from "./SearchResults";
import SearchTitle from "./SearchTitle";

interface SearchPageProps {
  searchParams: SearchPageParams;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const { title, description } = searchMetadata(query, normalizePage(params.page));
  // Query pages: noindex (each one costs an AniList request; robots.ts also disallows /search).
  return query ? { title, description, robots: { index: false, follow: true } } : { title, description };
}

type SearchResult =
  | { ok: true; media: AnimeMedia[]; hasNextPage: boolean }
  | { ok: false; rateLimited: boolean; retryAfterSeconds: number | null };

/**
 * Exactly one AniList request per render (CLAUDE.md §9.5): the banner's
 * report and the results both await this, and cache() makes it one call.
 * React's cache() compares arguments by identity, so the filters travel as
 * their canonical string (filtersQuery) and the year bound as a number.
 */
const runSearch = cache(async (query: string, page: number, filterKey: string, maxYear: number): Promise<SearchResult> => {
  try {
    const { media, hasNextPage } = await searchAnime(query, page, parseFiltersQuery(filterKey, maxYear));
    return { ok: true, media, hasNextPage };
  } catch (err) {
    unstable_rethrow(err);
    console.error(`[search] "${query}" page ${page}${filterKey ? ` (${filterKey})` : ""} failed:`, err);
    const anilist = err instanceof AniListError ? err : null;
    return { ok: false, rateLimited: anilist?.status === 429, retryAfterSeconds: anilist?.retryAfterSeconds ?? null };
  }
});

const viewOf = (result: SearchResult, page: number) =>
  searchView(result.ok ? { ok: true, shown: result.media.length, hasNextPage: result.hasNextPage } : result, page);

/**
 * Skill 04 · Great Sage: the owner's search page in the Tempest theme. The
 * home is the landing's console on the night sky; a query page keeps his
 * order (search box on top, results header, grid, pagination).
 *
 * Dynamic, and deliberately no loading.tsx: it can't read the query, so its
 * server-rendered fallback would paint the wrong page (the home) on every
 * full load of a results URL, and Next never shows it for ?q / ?page
 * navigations anyway (it reuses this page). Instead the banner renders at
 * once and two Suspense boundaries, keyed by the search (query, filters,
 * page: lib/search.ts#searchKey), stream the Great Sage's report and the
 * results; their fallbacks are the pending line and skeleton cards. Filter
 * params without a query are ignored (never a search without a title). The banner stays mounted across searches, so the sky
 * doesn't flash and text typed into the box while AniList answers survives.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const page = normalizePage(params.page);

  if (!query) {
    return (
      <>
        <SearchBanner mode="home" />
        {/* No token for the home: empties the status line (a client visit from a results page). */}
        <SearchArrival searchKey={searchKey("", 1)} status="" />
        <SearchTitle title={searchDocumentTitle("", 1)} />
      </>
    );
  }

  // A dynamic server page may read the clock (the year bound of the filters).
  const maxYear = validYearRange(new Date()).max;
  const filters = normalizeFilters(params, maxYear);
  const key = searchKey(query, page, filters);
  return (
    // No wrapper element: the first element is PageBanner's <header> (not focusable, so
    // Next's post-navigation focus() is a no-op and SearchArrival decides focus).
    <>
      <SearchBanner
        mode="query"
        query={query}
        page={page}
        filters={filters}
        maxYear={maxYear}
        sage={
          <Suspense key={key} fallback={<SearchPendingSage page={page} filters={filters} />}>
            <SearchReport query={query} page={page} filters={filters} maxYear={maxYear} />
          </Suspense>
        }
      />
      <div className={`${APP_CONTAINER} flex flex-col gap-8`}>
        <Suspense key={key} fallback={<SearchPending query={query} page={page} filters={filters} searchKey={key} />}>
          <SearchOutcome query={query} page={page} filters={filters} maxYear={maxYear} searchKey={key} />
        </Suspense>
      </div>
      <SearchTitle title={searchDocumentTitle(query, page)} />
    </>
  );
}

interface SearchArgs {
  query: string;
  page: number;
  filters: SearchFilters;
  maxYear: number;
}

/** The banner's Great Sage line for one search. */
async function SearchReport({ query, page, filters, maxYear }: SearchArgs) {
  const line = searchSageLine(viewOf(await runSearch(query, page, filtersQuery(filters), maxYear), page), filters);
  return (
    <SageLine kind={line.kind} scan="load" className="mt-4">
      {line.text}
    </SageLine>
  );
}

/** One search, rendered: the results (or a panel) and the arrival. */
async function SearchOutcome({ query, page, filters, maxYear, searchKey: key }: SearchArgs & { searchKey: string }) {
  const result = await runSearch(query, page, filtersQuery(filters), maxYear);
  const view = viewOf(result, page);
  return (
    <>
      {view.kind === "results" && result.ok ? (
        <>
          <SearchResults media={result.media} heading={resultsHeading(view.window)} />
          <SearchPagination query={query} filters={filters} results={view.window} />
        </>
      ) : view.kind === "none" ? (
        <NoResultsPanel query={query} filters={filters} />
      ) : view.kind === "pastEnd" ? (
        <PastEndPanel query={query} page={page} filters={filters} />
      ) : view.kind === "error" ? (
        <SearchErrorPanel
          query={query}
          page={page}
          filters={filters}
          rateLimited={view.rateLimited}
          retryAfterSeconds={view.retryAfterSeconds}
        />
      ) : null}
      <SearchArrival searchKey={key} status={searchStatus(view, filters)} />
    </>
  );
}
