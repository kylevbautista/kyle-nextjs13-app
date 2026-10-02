"use client";
import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import { FOCUS_RING, QUIET_BUTTON } from "@/components/theme/tokens";
import { seasonLabelOf, type SeasonPhase } from "@/lib/anime/seasonCopy";
import { seasonPath, shiftSeason, validYearRange, type SeasonName } from "@/lib/season";
import { rememberSeasonFocus, takeSeasonFocus, type SeasonFocusSlot } from "./seasonFocus";

const TILE = `inline-flex h-11 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#95ccff]/40 bg-white/5 px-2.5 text-[13px] font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 min-[360px]:px-3 min-[360px]:text-sm ${FOCUS_RING}`;

/**
 * A link to another season. It prefetches only once the reader shows intent
 * (hover, focus, touch): viewport prefetch would fetch both neighbours on
 * every view, and can wake their ISR regeneration (server AniList calls).
 * `intent={false}` never prefetches (/anime is a redirect). On a click it
 * leaves the focus token for the new page (seasonFocus.ts).
 */
export function SeasonLink({
  href,
  slot,
  intent = true,
  className,
  children,
}: {
  href: string;
  slot: SeasonFocusSlot;
  intent?: boolean;
  className: string;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const arm = () => {
    if (intent && !armed) setArmed(true);
  };
  return (
    <Link
      href={href}
      prefetch={intent && armed ? null : false}
      onPointerEnter={arm}
      onFocus={arm}
      onTouchStart={arm}
      onNavigate={() => rememberSeasonFocus(slot, href === "/anime" ? null : href)}
      data-season-nav={slot}
      className={className}
    >
      {children}
    </Link>
  );
}

/**
 * Previous / next season tiles (only inside the valid year window, at the
 * clock's year) and "Current season" for any other season. The window and
 * phase come from the caller's clock: the data's fetch time until the minute
 * clock runs, so the static HTML hydrates cleanly.
 */
export default function SeasonNav({
  year,
  season,
  nowMs,
  phase,
  showCurrent,
}: {
  year: number;
  season: SeasonName;
  /** null: not known yet (error.tsx before hydration) → both tiles show; proxy.ts guards the window. */
  nowMs: number | null;
  phase: SeasonPhase | null;
  showCurrent: boolean;
}) {
  const prev = shiftSeason(year, season, -1);
  const next = shiftSeason(year, season, 1);
  const range = nowMs === null ? null : validYearRange(new Date(nowMs));
  const prevInWindow = range === null || prev.year >= range.min;
  const nextInWindow = range === null || next.year <= range.max;

  // Runs when this page mounts, before Next's own focus call (a no-op here).
  const restoreFocus = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const slot = takeSeasonFocus(seasonPath(year, season));
      if (!slot) return;
      const target = slot === "title" ? null : node.querySelector<HTMLElement>(`[data-season-nav="${slot}"]`);
      (target ?? document.getElementById("season-title"))?.focus({ preventScroll: true });
    },
    [year, season]
  );

  return (
    <nav ref={restoreFocus} aria-label="Seasons" className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[repeat(2,minmax(10.5rem,auto))]">
        {prevInWindow ? (
          <SeasonLink slot="prev" href={seasonPath(prev.year, prev.season)} className={`${TILE} justify-start`}>
            <LinkPendingGlyph glyph="‹" />
            <span className="sr-only">Previous season: </span>
            {seasonLabelOf(prev.year, prev.season)}
          </SeasonLink>
        ) : (
          <span aria-hidden="true" />
        )}
        {nextInWindow ? (
          <SeasonLink slot="next" href={seasonPath(next.year, next.season)} className={`${TILE} justify-end`}>
            <span className="sr-only">Next season: </span>
            {seasonLabelOf(next.year, next.season)}
            <LinkPendingGlyph glyph="›" />
          </SeasonLink>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      {showCurrent && phase !== null && phase !== "current" && (
        // /anime resolves to the current season per request (proxy.ts), so it never goes stale in this HTML.
        <SeasonLink slot="title" href="/anime" intent={false} className={QUIET_BUTTON}>
          Current season
          <LinkPendingGlyph glyph="→" />
        </SeasonLink>
      )}
    </nav>
  );
}
