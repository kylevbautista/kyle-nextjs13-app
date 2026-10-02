import type { Metadata } from "next";
import {
  getTopAnimeJinkan,
  JikanError,
} from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import AboutRanking from "./AboutRanking";
import CrownConsole from "./CrownConsole";
import GlanceStats from "./GlanceStats";
import { crownLead, crownOf, fetchedLine, glanceStats } from "./ranking";
import TopAnimeBanner from "./TopAnimeBanner";
import TopAnimeList from "./TopAnimeList";
import TopAnimeShell from "./TopAnimeShell";

// The MyAnimeList ranking moves slowly; regenerate at most once an hour.
export const revalidate = 3600;

const description = "MyAnimeList's highest-ranked anime (via Jikan), each with a Track shortcut.";

export const metadata: Metadata = {
  title: "Top Anime",
  description,
  openGraph: {
    title: "Top Anime",
    description,
    images: [
      {
        url: "/rimuru.png",
        width: 200,
        height: 141,
      },
    ],
  },
};

/**
 * Static ISR, like the landing: no request APIs, and deliberately no
 * loading.tsx (it would ship the skeleton and hide the ranking in a
 * <div hidden> until JavaScript swaps it in; CLAUDE.md §9.15).
 *
 * Page 1 is fetched here. A Jikan failure or an empty ranking throws, so ISR
 * keeps the last good page (or error.tsx offers a Retry).
 */
export default async function TopAnime() {
  const firstPage = await getTopAnimeJinkan({ page: 1 });
  if (firstPage.items.length === 0) {
    throw new JikanError("Jikan returned an empty ranking for page 1");
  }
  // When this render fetched the ranking (server component: not Date.now(), which the React Compiler lint rejects in render).
  const fetchedAt = new Date().getTime();
  const crown = crownOf(firstPage.items);

  return (
    <TopAnimeShell
      banner={
        <TopAnimeBanner
          sage={{ kind: "Report", text: fetchedLine(fetchedAt) }}
          aside={crown ? <CrownConsole crown={crown} lead={crownLead(firstPage.items)} /> : undefined}
        >
          <GlanceStats count={firstPage.items.length} facts={glanceStats(firstPage.items)} />
        </TopAnimeBanner>
      }
    >
      <TopAnimeList initialPage={firstPage} />
      <AboutRanking />
    </TopAnimeShell>
  );
}
