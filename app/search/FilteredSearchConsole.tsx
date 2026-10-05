"use client";
import Link from "next/link";
import { useState } from "react";
import { CountBadge, FilterIcon, FilterSelect } from "@/components/theme/FilterSelect";
import { SearchConsole } from "@/components/theme/SearchConsole";
import { GHOST_BUTTON_CONSOLE, TEXT_LINK_CONSOLE } from "@/components/theme/tokens";
import { rememberSearchFocus } from "@/components/utils/searchArrival";
import {
  APPLY_FILTERS,
  CLEAR_FILTERS,
  FILTERS_LABEL,
  FILTER_FIELDS,
  filterToggleName,
  searchFilterOptions,
} from "@/lib/anime/searchCopy";
import {
  activeFilterCount,
  normalizeQuery,
  searchKey,
  searchResultsPath,
  type FilterParam,
  type SearchFilters,
} from "@/lib/search";
import { SEARCH_FILTERS_ID, normalizeFilters, readFilterParams } from "@/lib/searchFilters";

/** My List's filters toggle on the night sky: the console's ghost button, icon-only below 640px. */
const TOGGLE = `${GHOST_BUTTON_CONSOLE} js-only relative h-12 shrink-0 max-sm:w-12 max-sm:px-0`;

const selectId = (param: FilterParam) => `${SEARCH_FILTERS_ID}-${param}`;

/**
 * /search's results box: the compact SearchConsole plus My List's filter
 * console (a toggle with a count badge, labelled selects, Apply / Clear).
 * Filters narrow a title search; they never auto-submit (each change would
 * cost an AniList request), and a new title searched from this box keeps
 * them. The submitted URL is canonical (lib/search.ts#searchResultsPath): the
 * selects' empty values never reach it.
 *
 * Closed by default; with filters applied the panel is always shown from
 * 1024px (My List's pattern). Without JavaScript the toggle is hidden, the
 * panel shown, and the form submits natively (normalization drops the empty
 * params). `maxYear` comes from the server (this file never reads the clock).
 */
export default function FilteredSearchConsole({
  query,
  page,
  applied,
  maxYear,
}: {
  query: string;
  page: number;
  applied: SearchFilters;
  maxYear: number;
}) {
  const [open, setOpen] = useState(false);
  /** Bumped when the panel closes: its selects go back to what is applied (an unapplied change never rides along with the next Analyze). */
  const [resets, setResets] = useState(0);
  const count = activeFilterCount(applied);
  const options = searchFilterOptions(maxYear);
  return (
    <SearchConsole
      size="compact"
      defaultValue={query}
      className="max-w-3xl"
      hrefFor={(data) =>
        searchResultsPath(normalizeQuery(String(data.get("q") ?? "")), 1, normalizeFilters(readFilterParams(data), maxYear))
      }
      toggle={
        <button
          type="button"
          aria-expanded={open}
          aria-controls={SEARCH_FILTERS_ID}
          aria-label={filterToggleName(count)}
          onClick={() => {
            if (open) setResets((count) => count + 1);
            setOpen(!open);
          }}
          className={count > 0 ? `${TOGGLE} lg:hidden` : TOGGLE}
        >
          <FilterIcon className="h-5 w-5 shrink-0" />
          <span className="max-sm:hidden">{FILTERS_LABEL}</span>
          <CountBadge
            count={count}
            className="inline-flex h-5 min-w-5 justify-center max-sm:absolute max-sm:-right-1.5 max-sm:-top-1.5"
          />
          <span aria-hidden="true" className="max-sm:hidden">
            {open ? "▴" : "▾"}
          </span>
        </button>
      }
    >
      <div
        id={SEARCH_FILTERS_ID}
        className={`${open ? "block" : "hidden"} mt-3 min-w-0 ${count > 0 ? "lg:block" : ""} [@media(scripting:none)]:block`}
      >
        {/* Keyed by the whole search (page included) and by each close: paging or closing the panel
            resets unapplied changes to what is applied, so the panel, the sub and the badge agree. The
            console itself is keyed without the page (SearchBanner), so text typed into the box survives
            paging. min-w-0: a fieldset defaults to min-content. */}
        <fieldset key={`${searchKey(query, page, applied)}#${resets}`} className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{FILTERS_LABEL}</legend>
          <div className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 md:grid-cols-5">
            <FilterSelect
              id={selectId("format")}
              name="format"
              label={FILTER_FIELDS.format}
              defaultValue={applied.format ?? ""}
              options={options.format}
            />
            <FilterSelect
              id={selectId("genre")}
              name="genre"
              label={FILTER_FIELDS.genre}
              defaultValue={applied.genre ?? ""}
              options={options.genre}
            />
            <FilterSelect
              id={selectId("year")}
              name="year"
              label={FILTER_FIELDS.year}
              defaultValue={applied.year === null ? "" : String(applied.year)}
              options={options.year}
            />
            <FilterSelect
              id={selectId("season")}
              name="season"
              label={FILTER_FIELDS.season}
              defaultValue={applied.season ?? ""}
              options={options.season}
            />
            <FilterSelect
              id={selectId("release")}
              name="release"
              label={FILTER_FIELDS.release}
              defaultValue={applied.release ?? ""}
              options={options.release}
              className="min-[375px]:col-span-2 md:col-span-1"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {count > 0 && (
              <Link
                href={searchResultsPath(query)}
                prefetch={false}
                onNavigate={() => rememberSearchFocus("title", query, 1)}
                className={TEXT_LINK_CONSOLE}
              >
                {CLEAR_FILTERS}
              </Link>
            )}
            <button type="submit" className={`${GHOST_BUTTON_CONSOLE} md:h-10`}>
              {APPLY_FILTERS}
            </button>
          </div>
        </fieldset>
      </div>
    </SearchConsole>
  );
}
