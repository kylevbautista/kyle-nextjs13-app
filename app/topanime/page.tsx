import type { Metadata } from "next";
import { fetchTopAnimePage, MyAnimeListError } from "@/server/lib/myanimelist";
import AboutRanking from "./AboutRanking";
import CrownConsole from "./CrownConsole";
import GlanceStats from "./GlanceStats";
import { crownLead, crownOf, fetchedLine, glanceStats } from "./ranking";
import TopAnimeBanner from "./TopAnimeBanner";
import TopAnimeList from "./TopAnimeList";
import TopAnimeShell from "./TopAnimeShell";

// The MyAnimeList ranking moves slowly; regenerate at most once an hour.
export const revalidate = 3600;

const description = "MyAnimeList's highest-ranked anime, each with a Track shortcut.";

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
 * Page 1 is fetched here, from MyAnimeList's API: fresh in every ISR render,
 * but `next build` can reuse a copy cached by a build up to an hour earlier,
 * so the banner's time is MAL's own (fetchedAt, from its Date header), never
 * the render's. A failure or an empty ranking throws, so ISR keeps the last
 * good page (or error.tsx offers a Retry).
 */
export default async function TopAnime() {
  const { page: firstPage, fetchedAt } = await fetchTopAnimePage(1);
  if (firstPage.items.length === 0) {
    throw new MyAnimeListError("MyAnimeList returned an empty ranking for page 1");
  }
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
