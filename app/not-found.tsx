import type { Metadata } from "next";
import Link from "next/link";
import NightSky from "@/components/home/NightSky";
import { SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import CardPage from "@/components/theme/CardPage";
import {
  CARD_ACTIONS,
  CARD_TEXT,
  CARD_TITLE_CLASS,
  GHOST_BUTTON_CONSOLE,
  PRIMARY_BUTTON_CONSOLE,
  STATUS_NUMERAL,
  STATUS_SLIME,
} from "@/components/theme/tokens";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Also rendered for notFound() from layouts (e.g. /user/<unknown id>), always under the root layout. */
export default function NotFound() {
  return (
    <CardPage titleId="not-found-title" sky={<NightSky variant="page" forest={false} />}>
      <div className="flex flex-col items-center">
        {/* A fixed idScope: one slime per document, and this page can be rendered from a layout. */}
        <Slime size={64} mood="worried" idScope="not-found" className={STATUS_SLIME} />
        <p className={STATUS_NUMERAL}>404</p>
      </div>
      <h1 id="not-found-title" className={CARD_TITLE_CLASS}>
        This page got isekai&apos;d
      </h1>
      <p className={CARD_TEXT}>
        <SageTag kind="Warning" />
        We couldn&apos;t find what you were looking for. Maybe it&apos;s airing next season?
      </p>
      <nav aria-label="Suggested pages" className={CARD_ACTIONS}>
        <Link href="/anime" className={PRIMARY_BUTTON_CONSOLE}>
          This season
        </Link>
        <Link
          href="/search"
          // Never prefetch bare /search (its "Search anime" <title> leaks into later
          // /search?q= navigations: Next 16.3, app/search/SearchTitle.tsx).
          prefetch={false}
          className={GHOST_BUTTON_CONSOLE}
        >
          Search
        </Link>
        <Link href="/" className={GHOST_BUTTON_CONSOLE}>
          Home
        </Link>
      </nav>
    </CardPage>
  );
}
