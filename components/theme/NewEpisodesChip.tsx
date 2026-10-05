"use client";
import { useNow } from "@/components/utils/useNow";
import { unloggedAired, type AiringFields } from "@/lib/anime/airing";
import { catchUpLabel } from "@/lib/anime/trackerConsole";
import type { UserAnimeData } from "@/lib/anime/types";
import { CATCH_UP_CHIP } from "./tokens";

/**
 * "2 new": aired episodes not logged yet (lib/anime/airing.ts#unloggedAired),
 * on My List cards and schedule rows. A small leaf on the 1 s clock, so an
 * episode that airs while the page is open counts without re-rendering the
 * list; SSR and hydration use `renderedAt` (the server's render time, the same
 * reference as the page's banner and sort). Nothing at 0.
 * `ownerName` is set on a visitor's view, so screen readers hear whose count it is.
 *
 * With `onCatchUp` (the list owner's card, the landing demo) it is the "Log N
 * new" button: the exact count, from the userData the card shows (so taps still
 * saving are already subtracted), passed back on click so the request never
 * asks for more than the reader saw aired.
 */
export default function NewEpisodesChip({
  media,
  ownerName = null,
  renderedAt = null,
  className = "",
  onCatchUp,
  title,
  demo = false,
}: {
  media: Partial<AiringFields> & { userData: Pick<UserAnimeData, "listType" | "episodeProgressNumber"> };
  ownerName?: string | null;
  renderedAt?: number | null;
  className?: string;
  onCatchUp?: (count: number, button: HTMLButtonElement) => void;
  /** Names the show in the button's accessible name. */
  title?: string;
  demo?: boolean;
}) {
  const now = useNow();
  const count = unloggedAired(media, now ?? renderedAt);
  if (!count) return null;
  if (onCatchUp) {
    return (
      <button
        type="button"
        data-catch-up=""
        onClick={(event) => onCatchUp(count, event.currentTarget)}
        aria-label={catchUpLabel({ count, from: media.userData.episodeProgressNumber + 1, title, demo })}
        title="Mark the aired episodes as watched"
        className={`${CATCH_UP_CHIP} ${className}`}
      >
        Log {count} new
      </button>
    );
  }
  const shown = count > 99 ? "99+" : String(count);
  const episodes = `${count} aired ${count === 1 ? "episode" : "episodes"}`;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-[#95ccff]/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#cfe8ff] ring-1 ring-inset ring-[#95ccff]/40 ${className}`}
    >
      <span aria-hidden="true">{shown} new</span>
      <span className="sr-only">
        {ownerName ? `${ownerName} hasn't logged ${episodes}` : `${episodes} not logged yet`}
      </span>
    </span>
  );
}
