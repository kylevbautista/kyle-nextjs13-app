"use client";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import { useAnimeDetails } from "@/components/theme/AnimeDetailsDialog";
import { CARD_LAYOUT } from "@/components/theme/cardLayout";
import { nextAiring } from "@/lib/anime/airing";
import type { AnimeMedia } from "@/lib/anime/types";

/** The season page's card (components/theme/cardLayout.ts). */
const { Card } = CARD_LAYOUT;

/**
 * Search results as the season page's anime card, with its details sheet.
 * A client island because the card takes components and callbacks, which a
 * server page can't pass.
 */
export default function SearchResults({ media }: { media: AnimeMedia[] }) {
  const { openDetails, sheet } = useAnimeDetails({
    Action: CARD_LAYOUT.Action,
    fallbackFocusId: "search-results-title",
  });
  // Per-second countdowns need a pause control (WCAG 2.2.2).
  const hasCountdowns = media.some((item) => nextAiring(item) !== null);
  return (
    <>
      {hasCountdowns && (
        <div className="-mt-2 mb-2 flex w-full max-w-7xl justify-end">
          <LiveTimersToggle />
        </div>
      )}
      {/* w-full: search's <main> centers its children, so the grid would shrink-wrap. */}
      <ol role="list" className={`${CARD_LAYOUT.grid} w-full max-w-7xl`}>
        {media.map((item, index) => (
          <li key={item.id} className="flex min-w-0">
            <Card
              media={item}
              Action={CARD_LAYOUT.Action}
              onOpenDetails={openDetails}
              coverSizes={CARD_LAYOUT.searchCoverSizes}
              eager={index < CARD_LAYOUT.eager}
              headingLevel={2}
            />
          </li>
        ))}
      </ol>
      {sheet}
    </>
  );
}
