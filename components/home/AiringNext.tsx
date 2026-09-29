import Link from "next/link";
import type { LandingSeasonMeta } from "@/lib/landing";
import AiringGrid, { LiveTimersToggle, ReportPanel } from "./AiringGrid";
import {
  CHAPTER_CLASS,
  CHAPTER_SUB_CLASS,
  CHAPTER_TITLE_CLASS,
  EYEBROW_CLASS,
  FOCUS_RING,
  SageLine,
} from "./SageLine";

/**
 * Chapter 1 · Magic Sense: this season's soonest episodes, counting down live.
 * The header and stat line are server-rendered; the grid is a client island.
 * `continuingIds` reaches the grid through LandingProvider (isContinuing).
 */
export default function AiringNext({
  season,
  airingIds,
}: {
  season: LandingSeasonMeta | null;
  airingIds: number[];
  continuingIds: number[];
}) {
  const sub = !season
    ? "Every show this season, plus series continuing from earlier seasons, counts down live to its next episode. Times are Pacific."
    : season.preview
      ? `${season.label} starts ${season.startsLabel}. Here's what premieres first, plus the long-runners carrying on, each counting down live. Times are Pacific.`
      : `Every show in ${season.label}, plus series continuing from earlier seasons, counts down live to its next episode. Times are Pacific.`;

  const stat =
    season?.showCount != null
      ? `AniList lists ${season.showCount} ${season.label} shows${
          season.continuingCount ? `, plus ${season.continuingCount} continuing from earlier seasons` : ""
        }.`
      : null;

  const live = season !== null && airingIds.length > 0;

  return (
    <section id="airing-next" aria-labelledby="airing-next-title" className={CHAPTER_CLASS}>
      {/* One soft glow at the top left. closest-side fades to nothing at every
          edge, so the box never shows; main clips the overhang. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-48 -top-32 -z-10 h-[44rem] w-[60rem] bg-[radial-gradient(closest-side,rgba(93,174,241,.10),rgba(93,174,241,.03)_60%,transparent)]"
      />

      <div className="flex flex-col gap-4 laptop:flex-row laptop:items-end laptop:justify-between laptop:gap-10">
        <div data-reveal="" className="max-w-2xl">
          <p className={EYEBROW_CLASS}>Skill 01 · Magic Sense</p>
          <SageLine kind="Notice" scan="reveal" className="mt-4">
            Magic Sense active. Incoming episodes detected.
          </SageLine>
          <h2 id="airing-next-title" className={`mt-5 ${CHAPTER_TITLE_CLASS}`}>
            Know exactly when the next episode drops.
          </h2>
          <p className={`mt-4 ${CHAPTER_SUB_CLASS}`}>{sub}</p>
          {stat && <p className="mt-3 text-sm text-[rgb(164,164,164)]">{stat}</p>}
        </div>

        {live && (
          <div className="flex flex-col items-start gap-1 laptop:shrink-0 laptop:items-end">
            <Link
              href={season.seasonHref}
              data-cta="browse_season"
              data-cta-location="airing_next"
              className={`hidden h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#95ccff] transition-colors hover:bg-white/5 hover:text-white laptop:inline-flex ${FOCUS_RING}`}
            >
              Browse all of {season.label} <span aria-hidden="true">&nbsp;→</span>
            </Link>
            <LiveTimersToggle className="-ml-3 laptop:ml-0" />
          </div>
        )}
      </div>

      <div className="mt-10 sm:mt-12">
        {!season ? (
          <ReportPanel
            text="AniList isn't answering right now, so this season's countdowns are resting. The season page will try again."
            actions={[
              { href: "/anime", label: "Browse this season", cta: "browse_season" },
              { href: "/search", label: "Search anime", cta: "search" },
            ]}
          />
        ) : !airingIds.length ? (
          <ReportPanel
            text="No episodes are scheduled in the next week. Premiere dates are on the season page."
            actions={[{ href: season.seasonHref, label: `Browse ${season.label}`, cta: "browse_season" }]}
          />
        ) : (
          <AiringGrid
            ids={airingIds}
            seasonHref={season.seasonHref}
            seasonLabel={season.label}
            showCount={season.showCount}
          />
        )}
      </div>
    </section>
  );
}
