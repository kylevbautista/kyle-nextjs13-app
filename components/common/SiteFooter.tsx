import Link from "next/link";
import { Treeline } from "@/components/home/NightSky";
import { SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import {
  FOOTER,
  FOOTER_BODY,
  FOOTER_CREDIT_LINK,
  FOOTER_CREDITS,
  FOOTER_HORIZON,
  FOOTER_LINK,
  FOOTER_LINKS,
  FOOTER_NAV,
  FOOTER_ROW,
  FOOTER_SLIME,
  FOOTER_SLIME_TRACK,
  FOOTER_TREELINE,
} from "@/components/theme/tokens";

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * The forest floor at the end of every page: the banners' treeline (static), a slime standing on
 * it, and the data credits as a Great Sage report. A server component (classes from tokens.ts,
 * CLAUDE.md §9.21) that renders the <footer> itself, straight into <body>: the landing's StickyCta
 * hides while `body > footer` is on screen.
 */
export default function SiteFooter() {
  return (
    <footer className={FOOTER}>
      <div aria-hidden="true" className={FOOTER_HORIZON}>
        <Treeline className={FOOTER_TREELINE} />
        <div className={FOOTER_SLIME_TRACK}>
          <Slime size={28} animated={false} idScope="site-footer" className={FOOTER_SLIME} />
        </div>
      </div>
      <div className={FOOTER_BODY}>
        <div className={FOOTER_ROW}>
          <p className={FOOTER_CREDITS}>
            <SageTag kind="Report" />
            Anime data from{" "}
            <a href="https://anilist.co" {...EXTERNAL} className={FOOTER_CREDIT_LINK}>
              AniList
            </a>{" "}
            · rankings from{" "}
            <a href="https://myanimelist.net" {...EXTERNAL} className={FOOTER_CREDIT_LINK}>
              MyAnimeList
            </a>{" "}
            via{" "}
            <a href="https://jikan.moe" {...EXTERNAL} className={FOOTER_CREDIT_LINK}>
              Jikan
            </a>
            .
          </p>
          <nav aria-label="Footer" className={FOOTER_NAV}>
            <ul className={FOOTER_LINKS}>
              <li>
                <Link href="/topanime" className={FOOTER_LINK}>
                  Top anime
                </Link>
              </li>
              <li>
                {/* Never prefetch bare /search: the prefetch leaks its "Search anime" <title> into
                    later /search?q= navigations (Next 16.3; app/search/SearchTitle.tsx). */}
                <Link href="/search" prefetch={false} className={FOOTER_LINK}>
                  Search
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
