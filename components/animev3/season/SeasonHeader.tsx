"use client";
import type { ReactNode } from "react";
import type { SageKind } from "@/components/home/SageLine";
import PageBanner from "@/components/theme/PageBanner";
import { SEASON_EYEBROW, seasonLabelOf, type SeasonPhase } from "@/lib/anime/seasonCopy";
import type { SeasonName } from "@/lib/season";
import SeasonNav from "./SeasonNav";

/**
 * The season page's night-sky banner: "Skill 01 · Magic Sense", a Great Sage
 * line, the h1 ("Fall 2026 Anime", #season-title), the sub and the season
 * tiles; `aside` (the Next-episodes card) on the right from 1024px. Shared
 * by the page (SeasonBanner) and error.tsx.
 */
export default function SeasonHeader({
  year,
  season,
  sage,
  sageKey,
  sub,
  nowMs,
  phase,
  showCurrent,
  aside,
  asideClassName,
}: {
  year: number;
  season: SeasonName;
  sage: { kind: SageKind; text: ReactNode };
  sageKey: string;
  sub: ReactNode;
  nowMs: number | null;
  phase: SeasonPhase | null;
  showCurrent: boolean;
  aside?: ReactNode;
  asideClassName?: string;
}) {
  return (
    <PageBanner
      eyebrow={SEASON_EYEBROW}
      sage={sage}
      // Re-type the line only when what it says changes, never on the clock.
      sageKey={sageKey}
      title={`${seasonLabelOf(year, season)} Anime`}
      titleId="season-title"
      sub={sub}
      aside={aside}
      asideClassName={asideClassName}
    >
      <SeasonNav year={year} season={season} nowMs={nowMs} phase={phase} showCurrent={showCurrent} />
    </PageBanner>
  );
}
