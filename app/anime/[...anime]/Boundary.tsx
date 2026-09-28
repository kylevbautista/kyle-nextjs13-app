import PageBase from "@/components/animev3/PageBase";
import { getAniListData } from "@/components/animev3/utils/getAniListData";
import { SEASON_LABELS, SeasonName } from "@/lib/season";

interface BoundaryProps {
  year: number;
  season: SeasonName;
}

export default async function Boundary({ year, season }: BoundaryProps) {
  const result = await getAniListData({ page: 1, year, season, timeout: 8_000 });

  // Throwing (instead of rendering an empty grid) makes ISR keep serving the
  // last good page, and shows error.tsx when there is none.
  if (!result.ok) {
    throw new Error(
      `Couldn't load ${SEASON_LABELS[season]} ${year} from AniList: ${result.error}`
    );
  }

  return (
    <PageBase
      key={`${year}-${season}`}
      year={year}
      season={season}
      initialMedia={result.media}
      initialHasNextPage={result.hasNextPage}
    />
  );
}
