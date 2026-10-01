import type { ReactNode } from "react";
import type { SageKind } from "@/components/home/SageLine";
import PageBanner from "@/components/theme/PageBanner";

/**
 * /topanime's night-sky banner. The sub repeats the landing's Top Anime
 * doorway (components/home/SageSearch.tsx): keep the two in step. The aside
 * (the #1 console) only shows from 1024px, so phones keep a short banner.
 */
export default function TopAnimeBanner({
  sage,
  children,
  aside,
}: {
  sage: { kind: SageKind; text: ReactNode };
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <PageBanner
      eyebrow="Rankings · The Octagram"
      sage={sage}
      title="Top Anime"
      titleId="top-anime-title"
      sub="MyAnimeList's highest-ranked shows, each with a Track shortcut that finds it on AniList."
      aside={aside}
      asideClassName="hidden lg:block"
    >
      {children}
    </PageBanner>
  );
}
