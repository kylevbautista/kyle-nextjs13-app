"use client";
import { useNow } from "@/components/utils/useNow";
import { airedCount, nextAiring, type AiringFields } from "@/lib/anime/airing";
import { cappedPlusOneLabel } from "@/lib/anime/trackerConsole";
import type { UserAnimeData } from "@/lib/anime/types";
import { PLUS_ONE, PLUS_ONE_CAPPED, PLUS_ONE_DONE, PLUS_ONE_READY, PLUS_ONE_SAVING_DOT } from "./tokens";

/** The capped +1's glyph: a clock (scheduled), drawn in currentColor so forced colors repaints it. */
function ClockGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.6V10l2.9 1.9" />
    </svg>
  );
}

/**
 * My List's +1 (ListCard). Three looks on one element, so keyboard focus
 * stays on it as it changes: "+1"; capped (a dashed sage box with a clock)
 * when every episode that has aired is logged and the next one is known to
 * be ahead (an exact airedCount); ✓ at the last episode. A small leaf on the
 * shared 1 s clock (SSR and hydration use the page's `renderedAt`), so the
 * memo'd card stays clock-free and the cap lifts the same second the
 * "Log 1 new" chip appears.
 *
 * The tap that reaches the cap keeps "+1" until the burst's line is said.
 * Capped is aria-disabled, not disabled: a press still reaches the engine
 * (lib/anime/trackQueue.ts#tap), which decides on its own clock and says why
 * nothing was logged (phones have no tooltip). Only ✓ ignores presses. Past
 * the stored schedule's horizon the count is a lower bound, so it shows "+1"
 * and the server's schedule decides.
 */
export default function PlusOneButton({
  id,
  media,
  userData,
  title,
  renderedAt,
  saving,
  settling,
  pokeClass,
  onPress,
}: {
  id: string;
  media: Partial<AiringFields>;
  userData: UserAnimeData;
  title: string;
  /** The page's server render time: the clock's value until it hydrates. */
  renderedAt: number;
  saving: boolean;
  /**
   * The card's burst is open (CardActivity.burst): the capped look waits for its line, so a focused
   * button's name and state change only after "… logged. Caught up." is said, and never before the
   * save is confirmed.
   */
  settling: boolean;
  /** The squish keyframe class for the latest tap ("" when idle). */
  pokeClass: string;
  onPress: () => void;
}) {
  const now = useNow();
  const progress = userData.episodeProgressNumber;
  const total = media.episodes && media.episodes > 0 ? media.episodes : null;
  const done = total !== null && progress >= total;
  const count = done ? null : airedCount(media, now ?? renderedAt);
  const next = nextAiring(media);
  const capped =
    !settling && count?.exact && progress >= count.aired && next?.episode
      ? cappedPlusOneLabel({
          cap: { progress, aired: count.aired, next: { episode: next.episode, airingAt: next.airingAt } },
          title,
        })
      : null;

  return (
    <button
      id={id}
      type="button"
      onClick={() => {
        if (!done) onPress();
      }}
      // A held Enter logs one episode, not an auto-repeat stream.
      onKeyDown={(event) => {
        if (event.repeat) event.preventDefault();
      }}
      aria-disabled={done || capped ? true : undefined}
      // Starts with the visible "+1" (WCAG 2.5.3) and stays the same between presses, so screen
      // readers hear only the result line. It changes when the state does (capped after a burst's
      // line, or back to "+1" when the next episode airs), and the capped names keep the "+1:" start.
      aria-label={done ? `All episodes of ${title} watched` : capped ? capped.label : `+1: log the next episode of ${title}`}
      title={done ? "All episodes watched" : capped ? capped.title : "Mark the next episode as watched"}
      className={`${PLUS_ONE} ${pokeClass} ${done ? PLUS_ONE_DONE : capped ? PLUS_ONE_CAPPED : PLUS_ONE_READY}`}
    >
      {done ? <span aria-hidden="true">✓</span> : capped ? <ClockGlyph /> : "+1"}
      {saving && <span aria-hidden="true" className={PLUS_ONE_SAVING_DOT} />}
    </button>
  );
}
