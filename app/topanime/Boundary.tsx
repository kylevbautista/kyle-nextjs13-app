import {
  getTopAnimeJinkan,
  JikanError,
} from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import TopAnimeList from "./TopAnimeList";

/**
 * Fetches page 1 of the ranking. Throws when Jikan fails or sends an empty
 * ranking, so ISR keeps the last good page (or error.tsx shows a Retry).
 */
export async function Boundary() {
  const firstPage = await getTopAnimeJinkan({ page: 1 });
  if (firstPage.items.length === 0) {
    throw new JikanError("Jikan returned an empty ranking for page 1");
  }
  return <TopAnimeList initialPage={firstPage} />;
}
