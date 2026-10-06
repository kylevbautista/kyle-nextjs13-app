/**
 * /anime/<year>/<season>. Anything else under /anime/… (a bare year, a
 * capitalized season, extra segments, an out-of-range year) is redirected by
 * seasonRouteRedirect (in proxy.ts, before anything renders).
 *
 * A third segment only arrives through proxy.ts's rewrite: the static variant
 * in a reader's remembered sort (/anime/2026/fall/countdown, lib/seasonSort.ts),
 * never addressable from outside. ISR regenerates it without the proxy, so this
 * route parses it itself (parseSeasonRoute) and never redirects it.
 *
 * Static ISR, like /topanime: no request APIs, and deliberately no
 * loading.tsx (it would ship the skeleton and hide the real page in a
 * <div hidden> until JavaScript swaps it in; CLAUDE.md §9.15).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Boundary from "./Boundary";
import { seasonDescription } from "@/lib/anime/seasonCopy";
import { SEASON_LABELS, allSeasonParams, currentSeasonPath, seasonRouteRedirect } from "@/lib/season";
import { DEFAULT_SEASON_SORT, parseSeasonRoute, sortVariantSegment } from "@/lib/seasonSort";

export const dynamicParams = true;
// AniList allows ~30 requests/minute; countdowns use absolute timestamps, so 5 minutes is plenty.
export const revalidate = 300;

interface SeasonPageProps {
  params: Promise<{ anime: string[] }>;
}

export function generateStaticParams() {
  const params = allSeasonParams().map(({ year, season }) => ({ anime: [String(year), season] }));
  // Every season in the other sort too (the remembered-sort variant): no extra AniList requests (the
  // build's fetch cache serves the variant the request its default page just made), and no variant
  // ever renders on demand after a deploy, where a failed first render would be Next's bare 500.
  const other = sortVariantSegment(DEFAULT_SEASON_SORT === "popularity" ? "countdown" : "popularity");
  return other ? [...params, ...params.map(({ anime }) => ({ anime: [...anime, other] }))] : params;
}

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const parsed = parseSeasonRoute((await params).anime);
  if (!parsed) return { title: "Seasonal Anime" };

  const { year, season } = parsed;
  return {
    title: `${SEASON_LABELS[season]} ${year} Anime`,
    description: seasonDescription(year, season),
  };
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const segments = (await params).anime ?? [];
  const parsed = parseSeasonRoute(segments);
  // Only a malformed path that slipped past proxy.ts gets here.
  if (!parsed) redirect(seasonRouteRedirect(segments) ?? currentSeasonPath());

  return <Boundary year={parsed.year} season={parsed.season} sort={parsed.sort} />;
}
