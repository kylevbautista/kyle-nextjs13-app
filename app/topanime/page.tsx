import type { Metadata } from "next";
import { Boundary } from "./Boundary";
import TopAnimeShell from "./TopAnimeShell";

// The MyAnimeList ranking moves slowly; regenerate at most once an hour.
export const revalidate = 3600;

const description = "MyAnimeList's highest-rated anime, ranked (via Jikan).";

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

export default function TopAnime() {
  return (
    <TopAnimeShell>
      <Boundary />
    </TopAnimeShell>
  );
}
