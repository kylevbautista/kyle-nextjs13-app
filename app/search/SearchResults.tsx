"use client";
import { useAnimeDetails } from "@/components/theme/AnimeDetailsDialog";
import { CARD_LAYOUT } from "@/components/theme/cardLayout";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import { SECTION_TITLE_CLASS } from "@/components/theme/tokens";
import { nextAiring } from "@/lib/anime/airing";
import { RESULTS_LABEL } from "@/lib/anime/searchCopy";
import type { AnimeMedia } from "@/lib/anime/types";
import { SEARCH_LIST_TITLE_ID, SEARCH_TITLE_ID } from "@/lib/search";

/** The season page's card (components/theme/cardLayout.ts). */
const { Card } = CARD_LAYOUT;

/**
 * The results header row (the season page's "● Fall 2026 shows 72 ———" row,
 * with Pause timers when a result counts down) and the season page's cards
 * with their details sheet. A client island: the card takes components and
 * callbacks a server page can't pass.
 */
export default function SearchResults({
  media,
  heading,
}: {
  media: AnimeMedia[];
  heading: { value: string; spoken: string };
}) {
  const { openDetails, sheet } = useAnimeDetails({ Action: CARD_LAYOUT.Action, fallbackFocusId: SEARCH_TITLE_ID });
  // Per-second countdowns need a pause control (WCAG 2.2.2).
  const hasCountdowns = media.some((item) => nextAiring(item) !== null);
  return (
    <>
      <section aria-labelledby={SEARCH_LIST_TITLE_ID} className="flex min-w-0 flex-col gap-4">
        {/* min-h-11: the same height with or without the toggle (loading's skeleton row matches).
            The h2 grows from its content width, so the toggle wraps to its own line when both don't fit. */}
        {/* Phones: tighter gaps, so "Results 1–30" and Pause timers share a row at 320px. */}
        <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
          <h2
            id={SEARCH_LIST_TITLE_ID}
            tabIndex={-1}
            className={`${SECTION_TITLE_CLASS} grow scroll-mt-20 focus:outline-none max-sm:gap-2`}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#95ccff]" />
            {RESULTS_LABEL}
            <span aria-hidden="true" className="whitespace-nowrap font-mono text-sm font-normal tabular-nums text-[rgb(164,164,164)]">
              {heading.value}
            </span>
            <span className="sr-only">{heading.spoken}</span>
            {/* min-w-0 on phones: "Results 1,441–1,451 of 1,451" just fits 288px. */}
            <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-gradient-to-r from-[#95ccff]/30 to-transparent sm:min-w-8" />
          </h2>
          {/* px-2 below 360px: "Results 1–30" and the toggle fit 288px together. */}
          {hasCountdowns && <LiveTimersToggle short className="ml-auto max-[359px]:px-2" />}
        </div>
        <ol role="list" className={CARD_LAYOUT.grid}>
          {media.map((item, index) => (
            <li key={item.id} className="flex min-w-0">
              <Card
                media={item}
                Action={CARD_LAYOUT.Action}
                onOpenDetails={openDetails}
                coverSizes={CARD_LAYOUT.searchCoverSizes}
                eager={index < CARD_LAYOUT.eager}
                priority={index < CARD_LAYOUT.priority}
              />
            </li>
          ))}
        </ol>
      </section>
      {sheet}
    </>
  );
}
