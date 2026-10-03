"use client";
import Link from "next/link";
import ConsoleFrame from "@/components/theme/ConsoleFrame";
import { TrophyIcon } from "@/components/theme/icons";
import SageDoorway from "@/components/theme/SageDoorway";
import { SearchChips, SearchConsole } from "@/components/theme/SearchConsole";
import { DOORWAY_LINK, HAIRLINE } from "@/components/theme/tokens";
import { SEARCH_EYEBROW, SEARCH_QUESTION, SEARCH_SUB } from "@/lib/anime/searchCopy";
import { trackLanding } from "./analytics";
import { CHAPTER_SUB_CLASS, CHAPTER_TITLE_CLASS, EYEBROW_CLASS, SageLine } from "./SageLine";

/**
 * Chapter 4 · Great Sage: the demo of /search. Its frame, console and chips
 * ARE /search's (components/theme/ConsoleFrame, SearchConsole; CLAUDE.md
 * §9.18): change them there and both follow. next/form: a plain GET form
 * without JS, a client navigation with it. Nothing here prefetches /search
 * (the console and the chips never do): every search page costs an AniList
 * request.
 */
export default function SageSearch() {
  return (
    <section
      id="sage-search"
      aria-labelledby="sage-search-title"
      className="relative isolate mx-auto max-w-3xl scroll-mt-20 px-4 py-20 [contain:inline-size] sm:py-28"
    >
      <ConsoleFrame className="p-5 sm:p-8">
        <div data-reveal="">
          <p className={EYEBROW_CLASS}>{SEARCH_EYEBROW}</p>
          <SageLine kind="Question" scan="reveal" className="mt-4">
            {SEARCH_QUESTION}
          </SageLine>
          <h2 id="sage-search-title" className={`mt-5 ${CHAPTER_TITLE_CLASS}`}>
            Ask the Great Sage.
          </h2>
          <p className={`mt-4 ${CHAPTER_SUB_CLASS}`}>{SEARCH_SUB}</p>
        </div>

        <SearchConsole
          size="large"
          className="mt-7"
          onSubmit={() => trackLanding("search_submit", { location: "sage_search" })}
        />
        <SearchChips onChip={(chip) => trackLanding("search_chip", { chip })} />

        <div aria-hidden="true" className={`my-7 ${HAIRLINE}`} />

        <SageDoorway
          kind="Question"
          icon={<TrophyIcon className="h-10 w-10 shrink-0" />}
          line="Looking for the all-time greats?"
          lead="Top Anime:"
          text="MyAnimeList's highest-ranked shows, each with a Track shortcut."
          action={
            <Link
              href="/topanime"
              onClick={() => trackLanding("cta_click", { cta: "top_anime", location: "sage_search" })}
              className={DOORWAY_LINK}
            >
              See the rankings <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </ConsoleFrame>
    </section>
  );
}
