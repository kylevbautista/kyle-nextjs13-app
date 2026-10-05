import Link from "next/link";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import SagePanel from "@/components/theme/SagePanel";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/theme/tokens";
import { CLEAR_FILTERS, SEASON_DOORWAY, errorCopy, noResultsCopy, pastEndCopy } from "@/lib/anime/searchCopy";
import { NO_FILTERS, hasFilters, searchResultsPath, type SearchFilters } from "@/lib/search";
import { SearchPageLink } from "./SearchPagination";

/*
 * /search's empty and error states. Claims are about this search ("No anime
 * found for “q”", "skips adult titles"), never "AniList has no …". Titles are
 * h2 (the h1 is the banner's). No role="alert": the layout's status line
 * speaks client arrivals (one channel). A dead end's way out (Back to page 1,
 * Try again) is the view's primary action; the banner's Analyze button stays
 * the console's own submit.
 */

function BrowseSeasonLink() {
  return (
    <Link href="/anime" className={GHOST_BUTTON}>
      {SEASON_DOORWAY.link}
      <LinkPendingGlyph glyph="→" />
    </Link>
  );
}

/**
 * No primary without filters: the search box above is the way forward (a
 * different spelling). With filters, Clear filters is the primary.
 */
export function NoResultsPanel({ query, filters }: { query: string; filters: SearchFilters }) {
  const copy = noResultsCopy(query, filters);
  return (
    <SagePanel
      kind="Report"
      mood="worried"
      title={copy.title}
      actions={
        hasFilters(filters) ? (
          <>
            <SearchPageLink query={query} page={1} filters={NO_FILTERS} target="title" className={PRIMARY_BUTTON}>
              {CLEAR_FILTERS}
            </SearchPageLink>
            <BrowseSeasonLink />
          </>
        ) : (
          <BrowseSeasonLink />
        )
      }
    >
      {copy.text}
    </SagePanel>
  );
}

export function PastEndPanel({ query, page, filters }: { query: string; page: number; filters: SearchFilters }) {
  const copy = pastEndCopy(query, page, filters);
  return (
    <SagePanel
      kind="Report"
      mood="idle"
      title={copy.title}
      actions={
        <SearchPageLink query={query} page={1} filters={filters} className={PRIMARY_BUTTON}>
          <span aria-hidden="true">←</span>
          Back to page 1
        </SearchPageLink>
      }
    >
      {copy.text}
    </SagePanel>
  );
}

export function SearchErrorPanel({
  query,
  page,
  filters,
  rateLimited,
  retryAfterSeconds,
}: {
  query: string;
  page: number;
  filters: SearchFilters;
  rateLimited: boolean;
  retryAfterSeconds: number | null;
}) {
  const copy = errorCopy(rateLimited, retryAfterSeconds);
  return (
    <SagePanel
      kind="Warning"
      mood="worried"
      title={copy.title}
      actions={
        <>
          {/* A full document request (the owner's choice): it re-runs searchAnime
              (cache: "no-store"), never re-shows a cached failure, and works without JS. */}
          <a href={searchResultsPath(query, page, filters)} className={PRIMARY_BUTTON}>
            Try again
          </a>
          <BrowseSeasonLink />
        </>
      }
    >
      {copy.text}
    </SagePanel>
  );
}
