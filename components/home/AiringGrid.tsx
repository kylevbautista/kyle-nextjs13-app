"use client";
import Link from "next/link";
import type { AnimeCardActionProps } from "@/components/theme/AnimeCard";
import { useAnimeDetails } from "@/components/theme/AnimeDetailsDialog";
import { CARD_LAYOUT } from "@/components/theme/cardLayout";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import { trackLanding, type LandingCta } from "./analytics";
import LandingAddButton from "./LandingAddButton";
import { useLanding, useVisibleAiring } from "./LandingProvider";
import { FOCUS_RING } from "./SageLine";
import Slime from "./Slime";

/** The season page's card and this grid's shape (components/theme/cardLayout.ts). */
const { Card, landing } = CARD_LAYOUT;

/** The cards' add button: the landing's (sign-in intent dialog, analytics). Module level, so it is stable. */
const AiringNextAdd = ({ media, onResult }: AnimeCardActionProps) => (
  <LandingAddButton id={media.id} location="airing_next" size={landing.actionSize} onResult={onResult} />
);

/**
 * The live Magic Sense grid: the soonest episodes (landing.visible: 5 in the
 * classic layout, fewer on phones) plus an end card into the season. Aired
 * rows drop out after hydration and later candidates backfill in place, so
 * the grid never shifts. The cards are the season page's own and open the
 * same details sheet (tempest-theme rule 1).
 */
export default function AiringGrid({
  ids,
  seasonHref,
  seasonLabel,
  showCount,
}: {
  ids: number[];
  seasonHref: string;
  seasonLabel: string;
  showCount: string | null;
}) {
  const { isContinuing } = useLanding();
  const cards = useVisibleAiring(ids, landing.visible);
  const { openDetails, sheet } = useAnimeDetails({ Action: AiringNextAdd, fallbackFocusId: "airing-next-title" });

  if (!cards.length) {
    return (
      <>
        <ReportPanel
          text="Those episodes just aired. Fresh countdowns are on the season page."
          actions={[{ href: seasonHref, label: `Browse ${seasonLabel}`, cta: "browse_season" }]}
        />
        {sheet}
      </>
    );
  }

  const allLabel = `See all ${showCount ? `${showCount} ` : ""}${seasonLabel} shows`;
  return (
    <>
      <ul className={landing.grid}>
        {cards.map((media, index) => (
          <li key={media.id} className={`min-w-0 ${index >= landing.phoneLimit ? "hidden sm:flex" : "flex"}`}>
            <Card
              media={media}
              Action={AiringNextAdd}
              continuing={isContinuing(media.id)}
              onOpenDetails={openDetails}
              coverSizes={landing.coverSizes}
            />
          </li>
        ))}
        <li className="flex">
          <Link
            href={seasonHref}
            aria-label={allLabel}
            onClick={() => trackLanding("cta_click", { cta: "browse_season", location: "airing_next" })}
            className={`group relative flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#95ccff]/40 bg-gradient-to-b from-night-900 to-[rgb(18,18,18)] px-3 pb-5 pt-14 text-center transition-colors hover:border-[#95ccff]/70 ${FOCUS_RING}`}
          >
            <Slime size={56} lookLeft className="absolute -top-3 left-1/2 -translate-x-1/2 sm:-top-5" />
            <span className="text-sm font-semibold text-white">{allLabel}</span>
            <span className="text-xs text-[rgb(164,164,164)]">Sort by countdown or popularity, filter by format</span>
            <span
              aria-hidden="true"
              className="mt-1 text-lg text-[#95ccff] transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </li>
      </ul>
      {sheet}
    </>
  );
}

/** The landing's "Pause live timers" (a client leaf, so it can report its clicks). */
export function LandingTimersToggle({ className = "" }: { className?: string }) {
  return <LiveTimersToggle className={className} onToggle={(on) => trackLanding("live_timers", { on })} />;
}

/**
 * The "《Report》" state that stands in for the grid (AniList down, nothing
 * scheduled, or a very stale render): same box, a worried slime and exits.
 */
export function ReportPanel({
  text,
  actions,
}: {
  text: string;
  actions: { href: string; label: string; cta?: LandingCta }[];
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-[#95ccff]/25 bg-[rgb(30,30,30)]/60 px-6 py-10 text-center">
      <Slime size={48} mood="worried" />
      <p className="max-w-md text-sm leading-6 text-[rgb(200,206,218)] sm:text-base">
        <span className="sr-only">Great Sage report: </span>
        <span aria-hidden="true" className="font-mono text-[#95ccff]">
          《Report》{" "}
        </span>
        {text}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {actions.map((action, index) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            prefetch={action.href.startsWith("/search") ? false : undefined}
            onClick={() => {
              if (action.cta) trackLanding("cta_click", { cta: action.cta, location: "airing_next" });
            }}
            className={`inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition-colors ${
              index === 0
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "border border-[#95ccff]/40 bg-white/5 text-[#e6f3ff] hover:bg-white/10"
            } ${FOCUS_RING}`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
