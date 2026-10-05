import { SageLine } from "@/components/home/SageLine";
import { CARD_LAYOUT } from "@/components/theme/cardLayout";
import { SOFT_TEXT, TEXT_LINK } from "@/components/theme/tokens";
import { NOSCRIPT_SAGE, NOSCRIPT_TEXT, loadingSageLine, loadingStatus, noscriptLink } from "@/lib/anime/searchCopy";
import type { SearchFilters } from "@/lib/search";
import SearchPendingStatus from "./SearchPendingStatus";

/** The season page's card skeleton (components/theme/cardLayout.ts). */
const { Skeleton, grid, searchSkeletons } = CARD_LAYOUT;

/*
 * A search on its way: the page's two Suspense fallbacks (keyed by the search:
 * query, filters, page; so every new search or page shows them at once). No directive, and
 * class strings only from tokens.ts / cardLayout.ts and literals here, so the
 * server page renders them (CLAUDE.md §9.21).
 *
 * Without JavaScript the streamed results never leave their hidden div, so
 * the skeletons are js-only and <noscript> says so, with AniList's own search
 * for the query.
 */

/** The banner's report while AniList answers ("《Analyze》 Searching AniList…"). */
export function SearchPendingSage({ page, filters }: { page: number; filters: SearchFilters }) {
  const line = loadingSageLine(page, filters);
  return (
    <>
      <SageLine kind={line.kind} scan="load" className="js-only mt-4">
        {line.text}
      </SageLine>
      <noscript>
        <SageLine kind="Report" className="mt-4">
          {NOSCRIPT_SAGE}
        </SageLine>
      </noscript>
    </>
  );
}

/** The Results row's box (min-h-11) and skeleton cards, so the first card lands where the first skeleton was. */
export default function SearchPending({
  query,
  page,
  filters,
  searchKey,
}: {
  query: string;
  page: number;
  filters: SearchFilters;
  searchKey: string;
}) {
  const link = noscriptLink(query);
  return (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        <div aria-hidden="true" className="js-only flex min-h-11 items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#95ccff]/50" />
          <span className="h-5 w-40 animate-pulse rounded bg-[rgb(38,38,38)]" />
          <span className="h-px min-w-0 flex-1 bg-gradient-to-r from-[#95ccff]/30 to-transparent" />
        </div>
        <ol aria-hidden="true" inert className={`js-only ${grid}`}>
          {Array.from({ length: searchSkeletons }, (_, i) => (
            <li key={i} className="flex min-w-0">
              <Skeleton />
            </li>
          ))}
        </ol>
        <noscript>
          <p className={`text-sm leading-6 [overflow-wrap:anywhere] ${SOFT_TEXT}`}>
            {NOSCRIPT_TEXT}{" "}
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
              {link.text} <span aria-hidden="true">↗</span>
            </a>
          </p>
        </noscript>
      </div>
      <SearchPendingStatus searchKey={searchKey} line={loadingStatus(query, page, filters)} />
    </>
  );
}
