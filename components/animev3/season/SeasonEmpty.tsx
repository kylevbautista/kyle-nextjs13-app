"use client";
import Link from "next/link";
import { SageLine } from "@/components/home/SageLine";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import SagePanel from "@/components/theme/SagePanel";
import { GHOST_BUTTON, GHOST_BUTTON_PANEL, PRIMARY_BUTTON } from "@/components/theme/tokens";
import {
  continuingHiddenCopy,
  emptyCopy,
  formatsHiddenCopy,
  formatsHiddenNote,
  onlyContinuingCopy,
  seasonLabelOf,
} from "@/lib/anime/seasonCopy";
import type { FormatKey } from "@/lib/anime/seasonFormats";
import { searchPath } from "@/lib/routes";
import type { SeasonName } from "@/lib/season";
import { SeasonLink } from "./SeasonNav";
import { useSeasonPhase } from "./useSeasonPhase";

/*
 * The season page's empty states. Claims are about this page ("No shows here
 * yet"), never about AniList as a whole: the page skips adult titles, and its
 * continuing series are TV only. Minute-clock leaves (the wording follows the
 * season's phase).
 */

interface SeasonProps {
  year: number;
  season: SeasonName;
  /** The data's fetch time, until the minute clock runs. */
  clockFallback: number;
}

/** Nothing to show at all. */
export function EmptySeasonPanel({ year, season, clockFallback, carryOverIncluded }: SeasonProps & { carryOverIncluded: boolean }) {
  const { phase } = useSeasonPhase(year, season, clockFallback);
  const known = phase ?? "current";
  const copy = emptyCopy(known, carryOverIncluded);
  return (
    <SagePanel
      kind="Report"
      mood="idle"
      title={copy.title}
      actions={
        <>
          {known !== "current" && (
            // /anime would redirect back here when this *is* the current season.
            <SeasonLink slot="title" href="/anime" intent={false} className={PRIMARY_BUTTON}>
              Current season
              <LinkPendingGlyph glyph="→" />
            </SeasonLink>
          )}
          <Link href={searchPath()} prefetch={false} className={GHOST_BUTTON}>
            Search anime
          </Link>
        </>
      }
    >
      {copy.text}
    </SagePanel>
  );
}

/** No new shows, and the continuing series are hidden by the toggle. */
export function ContinuingHiddenPanel({
  year,
  season,
  clockFallback,
  count,
  capped,
  onShow,
}: SeasonProps & { count: number; capped: boolean; onShow: () => void }) {
  const { phase } = useSeasonPhase(year, season, clockFallback);
  const copy = continuingHiddenCopy(phase ?? "current", count, capped);
  return (
    <SagePanel
      kind="Report"
      mood="idle"
      title={copy.title}
      actions={
        <button id="season-show-continuing" type="button" onClick={onShow} className={PRIMARY_BUTTON}>
          Show continuing series
        </button>
      }
    >
      {copy.text}
    </SagePanel>
  );
}

/** No new shows; the grid holds only continuing series. */
export function OnlyContinuingNote({ year, season, clockFallback }: SeasonProps) {
  const { phase } = useSeasonPhase(year, season, clockFallback);
  return (
    <SageLine kind="Report" size="sm" className="self-start">
      {onlyContinuingCopy(phase ?? "current", seasonLabelOf(year, season))}
    </SageLine>
  );
}

/**
 * Shows exist, but the format filter lists none: above the (empty) grid, in
 * the shows section, so its heading and a load error's Retry stay.
 */
export function FormatsHiddenPanel({
  label,
  n,
  exact,
  formats,
  cHidden,
  capped,
  onShowAll,
}: {
  label: string;
  /** Season shows loaded (all in hidden formats). */
  n: number;
  exact: boolean;
  formats: readonly FormatKey[];
  /** Continuing series hidden too (with TV, or by their own toggle). */
  cHidden: number;
  capped: boolean;
  onShowAll: () => void;
}) {
  const copy = formatsHiddenCopy({ label, n, exact, formats, cHidden, capped });
  return (
    <SagePanel
      kind="Report"
      mood="idle"
      title={copy.title}
      actions={
        <button type="button" onClick={onShowAll} className={PRIMARY_BUTTON}>
          Show every format
        </button>
      }
    >
      {copy.text}
    </SagePanel>
  );
}

/** Every season show is in a hidden format, but continuing series are listed below. */
export function FormatsHiddenNote({ label, exact, onShowAll }: { label: string; exact: boolean; onShowAll: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SageLine kind="Report" size="sm" className="self-start">
        {formatsHiddenNote(label, exact)}
      </SageLine>
      <button type="button" onClick={onShowAll} className={GHOST_BUTTON_PANEL}>
        Show every format
      </button>
    </div>
  );
}
