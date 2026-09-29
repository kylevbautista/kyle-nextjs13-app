import Link from "next/link";
import type { LandingSeasonMeta } from "@/lib/landing";
import HeroNextUp from "./HeroNextUp";
import HeroSlime from "./HeroSlime";
import NightSky, { MagicCircle } from "./NightSky";
import { SageLine, Skill } from "./SageLine";
import { SessionCta, SessionStatusLine } from "./SessionCta";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";

const TERTIARY_LINK = `inline-flex h-11 items-center rounded px-1 text-[#95ccff] underline-offset-2 hover:text-white hover:underline ${FOCUS}`;

/**
 * "Awakening": the landing hero. Server-rendered; only the slime, the session
 * CTA/status and the Next-episodes card are client islands. The H1 never
 * animates, so it stays the LCP element.
 *
 * One grid, three arrangements (DOM order = tab order: CTAs → status →
 * tertiary links → slime → card):
 * - phones: SageLine + 80px slime, then H1, subhead, stacked CTAs, ticker
 * - 640–1023px: slime stage above the text, one column
 * - 1024px+: text left; stage + Next-episodes card right
 */
export default function Hero({
  season,
  airingIds,
}: {
  season: LandingSeasonMeta | null;
  airingIds: number[];
}) {
  const browseHref = season?.browseHref ?? "/anime";
  const browseLabel = season?.browseLabel ?? "Browse this season";

  return (
    <section
      id="top"
      data-hero=""
      aria-labelledby="home-title"
      className="hero relative isolate -mt-2 overflow-hidden [contain:inline-size] laptop:flex laptop:min-h-[min(780px,calc(100svh-4rem))] laptop:flex-col laptop:justify-center"
    >
      <NightSky variant="hero" />

      <div className="mx-auto grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 pb-24 pt-6 sm:max-w-2xl sm:grid-cols-[minmax(0,1fr)] sm:px-6 sm:pt-10 laptop:max-w-6xl laptop:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] laptop:items-center laptop:gap-x-12 laptop:pb-28 laptop:pt-16">
        <div className="col-start-1 row-start-1 self-center sm:row-start-2 laptop:row-start-1">
          <SageLine kind="Notice" scan="load" caret>
            Reincarnation complete. Unique skill <Skill>Tracker</Skill> acquired.
          </SageLine>
        </div>

        <h1
          id="home-title"
          className="hero-title col-span-2 row-start-2 mt-4 bg-gradient-to-b from-white to-[#cfe8ff] bg-clip-text pb-1 text-[1.875rem] font-black leading-[1.08] tracking-tight text-transparent min-[360px]:text-[2.125rem] sm:col-span-1 sm:row-start-3 sm:mt-5 sm:max-w-[14ch] sm:text-5xl sm:leading-[1.04] laptop:row-start-2 laptop:text-6xl laptop:leading-[1.02]"
        >
          That time you never missed an episode again.
        </h1>

        <p className="col-span-2 row-start-3 mt-3 max-w-[34rem] text-base text-[#c9d6e6] sm:col-span-1 sm:row-start-4 sm:mt-4 sm:text-lg laptop:row-start-3 laptop:text-xl">
          Live countdowns for every show this season, a list that remembers your last episode,
          and a weekly schedule built from what you watch.
        </p>

        <div
          id="hero-cta"
          className="col-span-2 row-start-4 mt-6 flex flex-col gap-3 sm:col-span-1 sm:row-start-5 sm:flex-row laptop:row-start-4 laptop:mt-8"
        >
          <SessionCta location="hero" size="hero" />
          <Link
            href={browseHref}
            data-cta="browse_season"
            data-cta-location="hero"
            className={`inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#95ccff]/40 bg-white/5 px-6 font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 sm:h-14 sm:w-auto ${FOCUS}`}
          >
            {browseLabel}
          </Link>
        </div>

        <div className="col-span-2 row-start-5 mt-3 sm:col-span-1 sm:row-start-6 laptop:row-start-5">
          <SessionStatusLine variant="hero" />
        </div>

        <p className="col-span-2 row-start-6 flex flex-wrap items-center gap-x-1 text-sm text-[rgb(164,164,164)] sm:col-span-1 sm:row-start-7 laptop:row-start-6">
          <span className="pr-1">Just browsing?</span>
          <Link
            href="/search"
            prefetch={false}
            data-cta="search"
            data-cta-location="hero"
            className={TERTIARY_LINK}
          >
            Search any anime
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/topanime" data-cta="top_anime" data-cta-location="hero" className={TERTIARY_LINK}>
            Top Anime
          </Link>
        </p>

        {/* Right column on laptop; its children join the grid below that. */}
        <div className="contents laptop:col-start-2 laptop:row-span-6 laptop:row-start-1 laptop:flex laptop:w-[400px] laptop:flex-col laptop:self-center laptop:justify-self-end">
          <div className="relative col-start-2 row-start-1 flex items-end justify-center self-center sm:col-start-1 sm:row-start-1 sm:h-[170px] sm:w-[240px] sm:self-start laptop:-mb-3 laptop:h-[220px] laptop:w-full">
            {/* Phones: no magic circle; the slime sits in front of the moon instead. */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-0 -z-[6] h-11 w-11 -translate-y-[38%] translate-x-[-8%] rounded-full bg-[radial-gradient(circle_at_62%_58%,rgba(160,190,230,.35)_0_9%,transparent_10%),radial-gradient(circle_at_40%_70%,rgba(160,190,230,.25)_0_6%,transparent_7%),radial-gradient(circle_at_35%_35%,#f4f9ff,#cfe3ff)] shadow-[0_0_40px_8px_rgba(191,230,255,.22)] sm:hidden"
            />
            {/* Moonlit aura behind the circle: a gradient, never a blur. */}
            <span
              aria-hidden="true"
              className="absolute bottom-[64px] left-1/2 -z-[6] hidden h-[320px] w-[320px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(93,174,241,.20),rgba(93,174,241,.06)_55%,transparent)] sm:block laptop:bottom-[85px] laptop:h-[400px] laptop:w-[400px]"
            />
            <MagicCircle className="absolute bottom-[64px] left-1/2 -z-[5] hidden w-[240px] -translate-x-1/2 translate-y-1/2 sm:block laptop:bottom-[85px] laptop:w-[300px]" />
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 -z-[5] h-5 w-24 -translate-x-1/2 translate-y-1/3 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(149,204,255,.35),transparent_70%)] sm:h-8 sm:w-48 laptop:w-60"
            />
            <div className="relative z-[2]">
              <HeroSlime nextUpIds={airingIds} />
            </div>
          </div>

          <div className="relative z-[1] col-span-2 row-start-7 mt-6 w-full sm:col-span-1 sm:row-start-8 sm:mt-8 sm:max-w-[520px] laptop:mt-0 laptop:max-w-none">
            <HeroNextUp ids={airingIds} />
          </div>
        </div>
      </div>

      <a
        href="#airing-next"
        className={`absolute bottom-6 left-1/2 hidden h-11 -translate-x-1/2 items-center gap-2 rounded-full px-4 font-mono text-xs text-[#cfe8ff]/80 transition-colors hover:text-white sm:inline-flex ${FOCUS}`}
      >
        <span aria-hidden="true">
          <span className="text-[#95ccff]">《Question》</span> Continue? ↓
        </span>
        <span className="sr-only">Skip to this season&apos;s countdowns</span>
      </a>
    </section>
  );
}
