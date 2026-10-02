"use client";
import Link from "next/link";
import { SageLine } from "@/components/home/SageLine";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import SagePanel from "@/components/theme/SagePanel";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/theme/tokens";
import { continuingHiddenCopy, emptyCopy, onlyContinuingCopy, seasonLabelOf } from "@/lib/anime/seasonCopy";
import { searchPath } from "@/lib/routes";
import type { SeasonName } from "@/lib/season";
import { SeasonLink } from "./SeasonNav";
import { useSeasonPhase } from "./useSeasonPhase";

/*
 * The season page's empty states. Claims are about this page ("No shows here
 * yet"), never about AniList as a whole: the page skips ONAs, TV shorts and
 * adult titles. Minute-clock leaves (the wording follows the season's phase).
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
        <button type="button" onClick={onShow} className={PRIMARY_BUTTON}>
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
