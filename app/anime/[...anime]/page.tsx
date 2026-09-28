/**
 * /anime/<year>/<season>. Anything else under /anime/… (a bare year, a
 * capitalized season, extra segments, an out-of-range year) is redirected by
 * seasonRouteRedirect.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Boundary from "./Boundary";
import {
  SEASON_LABELS,
  SEASON_MONTHS,
  SeasonName,
  allSeasonParams,
  seasonRouteRedirect,
} from "@/lib/season";

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
  const label = `${SEASON_LABELS[season]} ${year}`;
  const { from, to } = SEASON_MONTHS[season];
  return {
    title: `${label} Anime`,
    description: `Every anime premiering in ${label} (${from} – ${to} ${year}): live countdowns to the next episode, air dates, studios, scores and synopses. Sort by countdown or popularity and add shows to your list.`,
  };
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const segments = (await params).anime ?? [];
  const target = seasonRouteRedirect(segments);
  if (target) redirect(target);

  return <Boundary year={Number(segments[0])} season={segments[1] as SeasonName} />;
}
