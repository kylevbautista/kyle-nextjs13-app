import Link from "next/link";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import SagePanel from "@/components/theme/SagePanel";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/theme/tokens";
import { SEASON_DOORWAY, errorCopy, noResultsCopy, pastEndCopy } from "@/lib/anime/searchCopy";
import { searchResultsPath } from "@/lib/search";
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

/** No primary: the search box above is the way forward (a different spelling). */
export function NoResultsPanel({ query }: { query: string }) {
  const copy = noResultsCopy(query);
  return (
    <SagePanel kind="Report" mood="worried" title={copy.title} actions={<BrowseSeasonLink />}>
      {copy.text}
    </SagePanel>
  );
}

export function PastEndPanel({ query, page }: { query: string; page: number }) {
  const copy = pastEndCopy(query, page);
  return (
    <SagePanel
      kind="Report"
      mood="idle"
      title={copy.title}
      actions={
        <SearchPageLink query={query} page={1} className={PRIMARY_BUTTON}>
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
  rateLimited,
  retryAfterSeconds,
}: {
  query: string;
  page: number;
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
          <a href={searchResultsPath(query, page)} className={PRIMARY_BUTTON}>
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
