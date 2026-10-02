/**
 * /anime/<year>/<season>. Anything else under /anime/… (a bare year, a
 * capitalized season, extra segments, an out-of-range year) is redirected by
 * seasonRouteRedirect (in proxy.ts, before anything renders).
 *
 * Static ISR, like /topanime: no request APIs, and deliberately no
 * loading.tsx (it would ship the skeleton and hide the real page in a
 * <div hidden> until JavaScript swaps it in; CLAUDE.md §9.15).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Boundary from "./Boundary";
import { seasonDescription } from "@/lib/anime/seasonCopy";
import { SEASON_LABELS, SeasonName, allSeasonParams, seasonRouteRedirect } from "@/lib/season";

export const dynamicParams = true;
// AniList allows ~30 requests/minute; countdowns use absolute timestamps, so 5 minutes is plenty.
export const revalidate = 300;

interface SeasonPageProps {
  params: Promise<{ anime: string[] }>;
}

function parseSeason(segments: string[] = []): { year: number; season: SeasonName } | null {
  if (seasonRouteRedirect(segments) !== null) return null;
  return { year: Number(segments[0]), season: segments[1] as SeasonName };
}

export function generateStaticParams() {
  return allSeasonParams().map(({ year, season }) => ({ anime: [String(year), season] }));
}

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const parsed = parseSeason((await params).anime);
  if (!parsed) return { title: "Seasonal Anime" };

  const { year, season } = parsed;
  return {
    title: `${SEASON_LABELS[season]} ${year} Anime`,
    description: seasonDescription(year, season),
  };
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const segments = (await params).anime ?? [];
  const target = seasonRouteRedirect(segments);
  if (target) redirect(target);

  return <Boundary year={Number(segments[0])} season={segments[1] as SeasonName} />;
}
