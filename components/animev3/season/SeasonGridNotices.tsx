"use client";
import type { Ref } from "react";
import { SageLine, SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import {
  CONSOLE_PANEL,
  FOCUS_RING,
  GHOST_BUTTON,
  MUTED_TEXT,
  PRIMARY_BUTTON,
  SOFT_TEXT,
} from "@/components/theme/tokens";
import { dividerText, loadErrorText, seasonLabelOf } from "@/lib/anime/seasonCopy";
import { seasonPath, shiftSeason, validYearRange, type SeasonName } from "@/lib/season";
import { SeasonLink } from "./SeasonNav";
import { useSeasonPhase } from "./useSeasonPhase";

/*
 * The rows the season grid (an <ol>) holds besides cards: the re-sort
 * divider after the pinned cards, the inline load error, and the end card.
 * None is a live region: PageBase's one status line speaks for the page.
 */

/** Countdown mode, after a later page: `k` shows below the pinned cards air sooner than some of them. */
export function OrderDivider({ k, onResort }: { k: number; onResort: () => void }) {
  return (
    <li className="col-span-full flex flex-col items-start gap-3 py-1 sm:flex-row sm:items-center">
      <span aria-hidden="true" className="hidden h-px w-6 shrink-0 border-t border-dashed border-[#95ccff]/30 sm:block" />
      <SageLine kind="Notice" size="sm" className="min-w-0">
        {dividerText(k)}
      </SageLine>
      <button type="button" onClick={onResort} className={`${GHOST_BUTTON} shrink-0`}>
        Re-sort
      </button>
      <span aria-hidden="true" className="hidden h-px min-w-6 flex-1 border-t border-dashed border-[#95ccff]/30 sm:block" />
    </li>
  );
}

/** A later page didn't load: what's shown so far, and Retry (the status line speaks the failure). */
export function LoadMoreError({
  label,
  shown,
  retrying,
  onRetry,
  retryRef,
}: {
  label: string;
  shown: number;
  retrying: boolean;
  onRetry: () => void;
  retryRef: Ref<HTMLButtonElement>;
}) {
  return (
    <li className={`${CONSOLE_PANEL} col-span-full flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center`}>
      <Slime size={48} mood="worried" className="shrink-0" />
      <p className="min-w-0 flex-1 text-sm leading-6 text-[#cfe8ff]">
        <SageTag kind="Warning" />
        {loadErrorText(label, shown)}
      </p>
      <button
        ref={retryRef}
        type="button"
        onClick={onRetry}
        aria-disabled={retrying || undefined}
        className={`${PRIMARY_BUTTON} shrink-0`}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </li>
  );
}

/* GHOST_BUTTON / QUIET_BUTTON that may wrap: on phones the end card can be one 138–173px column. */
const END_LINK = `inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-xl border border-[#95ccff]/40 bg-white/5 px-3 py-2 text-center text-sm font-semibold leading-5 text-[#e6f3ff] transition-colors hover:bg-white/10 ${FOCUS_RING}`;
const END_QUIET = `inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center text-sm font-medium leading-5 text-[rgb(200,206,218)] transition-colors hover:bg-white/5 hover:text-white ${FOCUS_RING}`;

/**
 * The landing's dashed end card, at the end of the season: the Great Sage's
 * count, continuing series, how fresh the data is, the next (or previous)
 * season and "Back to the top". A minute-clock leaf for the year window.
 */
export function SeasonEndCard({
  year,
  season,
  clockFallback,
  report,
  hidden,
  continuing,
  note,
  onBackToTop,
  spanClassName,
}: {
  year: number;
  season: SeasonName;
  clockFallback: number;
  report: string;
  /** How many of the season's shows are in hidden formats (null when none). */
  hidden: string | null;
  continuing: string | null;
  note: string;
  onBackToTop: () => void;
  /** Its grid span (components/theme/cardLayout.ts#endCardSpan: poster phones take a free cell in the last row). */
  spanClassName: string;
}) {
  const { nowMs } = useSeasonPhase(year, season, clockFallback);
  const range = validYearRange(new Date(nowMs ?? clockFallback));
  const next = shiftSeason(year, season, 1);
  const prev = shiftSeason(year, season, -1);
  const link =
    next.year <= range.max
      ? { target: next, text: "Next", glyph: "→" }
      : prev.year >= range.min
        ? { target: prev, text: "Previous", glyph: "←" }
        : null;

  return (
    <li className={`flex ${spanClassName}`}>
      {/* The landing's end card (components/home/AiringGrid.tsx). */}
      <div className="relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#95ccff]/40 bg-gradient-to-b from-night-900 to-[rgb(18,18,18)] px-3 pb-5 pt-14 text-center">
        <Slime size={56} mood="happy" lookLeft className="absolute -top-3 left-1/2 -translate-x-1/2 sm:-top-5" />
        <p className="text-sm leading-6 text-white">
          <SageTag kind="Report" />
          {report}
        </p>
        {hidden && <p className={`text-sm ${SOFT_TEXT}`}>{hidden}</p>}
        {continuing && <p className={`text-sm ${SOFT_TEXT}`}>{continuing}</p>}
        <p className={`text-xs ${MUTED_TEXT}`}>{note}</p>
        <div className="mt-1 flex w-full flex-col items-center gap-1">
          {link && (
            <SeasonLink slot="title" href={seasonPath(link.target.year, link.target.season)} className={END_LINK}>
              {link.glyph === "←" && <LinkPendingGlyph glyph="←" />}
              {`${link.text}: ${seasonLabelOf(link.target.year, link.target.season)}`}
              {link.glyph === "→" && <LinkPendingGlyph glyph="→" />}
            </SeasonLink>
          )}
          <button type="button" onClick={onBackToTop} className={END_QUIET}>
            Back to the top <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </li>
  );
}
