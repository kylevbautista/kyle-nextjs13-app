import Link from "next/link";
import type { ReactNode } from "react";
import Slime from "@/components/home/Slime";
import ConsoleFrame from "@/components/theme/ConsoleFrame";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import PageBanner from "@/components/theme/PageBanner";
import SageDoorway from "@/components/theme/SageDoorway";
import { SearchChips, SearchConsole } from "@/components/theme/SearchConsole";
import { DOORWAY_LINK, HAIRLINE } from "@/components/theme/tokens";
import {
  SEARCH_EYEBROW,
  SEARCH_HOME_TITLE,
  SEARCH_QUESTION,
  SEARCH_SUB,
  SEASON_DOORWAY,
  resultsSub,
} from "@/lib/anime/searchCopy";
import { SEARCH_TITLE_ID, searchKey, type SearchFilters } from "@/lib/search";
import FilteredSearchConsole from "./FilteredSearchConsole";

type SearchBannerProps =
  | { mode: "home" }
  /**
   * `sage`: the streamed Great Sage line (the page's Suspense boundary).
   * `maxYear`: the server's year bound for the filter panel.
   */
  | { mode: "query"; query: string; page: number; filters: SearchFilters; maxYear: number; sage: ReactNode };

/**
 * /search's night-sky banner, in the owner's two orders:
 * - home: eyebrow → 《Question》 → "Search anime" → sub → the landing's framed
 *   console (visible label, Try chips, the "Browse this season" doorway);
 * - query: eyebrow → the compact search box on top (with the filter toggle
 *   and panel) → the Great Sage's report → "Results for “q”" → sub (which
 *   lists the filters).
 * On a query page it sits outside the page's Suspense boundaries, so the sky
 * and the search box stay put while a search loads (text typed into the box
 * meanwhile survives); only the report line streams in. The box is keyed by
 * the search without the page, so a new search or new filters reset it to
 * what was searched, and paging keeps what was typed.
 */
export default function SearchBanner(props: SearchBannerProps) {
  if (props.mode === "home") {
    return (
      <PageBanner
        eyebrow={SEARCH_EYEBROW}
        sage={{ kind: "Question", text: SEARCH_QUESTION }}
        title={SEARCH_HOME_TITLE}
        sub={SEARCH_SUB}
      >
        <ConsoleFrame className="mt-6 max-w-3xl p-4 sm:mt-8 sm:p-6">
          <SearchConsole size="large" showLabel autoFocus />
          <SearchChips />
          <div aria-hidden="true" className={`my-6 ${HAIRLINE}`} />
          <SageDoorway
            kind="Question"
            icon={<Slime size={40} mood="idle" className="shrink-0" />}
            line={SEASON_DOORWAY.line}
            lead={SEASON_DOORWAY.lead}
            text={SEASON_DOORWAY.text}
            action={
              <Link href="/anime" className={DOORWAY_LINK}>
                {SEASON_DOORWAY.link}
                <LinkPendingGlyph glyph="→" />
              </Link>
            }
          />
        </ConsoleFrame>
      </PageBanner>
    );
  }

  const { query, page, filters, maxYear, sage } = props;
  return (
    <PageBanner
      eyebrow={SEARCH_EYEBROW}
      lead={
        <FilteredSearchConsole
          key={searchKey(query, 1, filters)}
          query={query}
          page={page}
          applied={filters}
          maxYear={maxYear}
        />
      }
      sageSlot={sage}
      title={
        <>
          Results for <span className="text-[#95ccff] [overflow-wrap:anywhere]">“{query}”</span>
        </>
      }
      titleId={SEARCH_TITLE_ID}
      sub={resultsSub(filters)}
    />
  );
}
