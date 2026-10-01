"use client";
import { useId, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { nextAiring } from "@/lib/anime/airing";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";
import { formatLabel, seasonLabel as toSeasonLabel } from "@/lib/landing";
import { trackLanding, type LandingCta, type LandingLocation } from "./analytics";
import CountdownText from "./CountdownText";
import LandingAddButton from "./LandingAddButton";
import { useLanding, useVisibleAiring } from "./LandingProvider";
import { FOCUS_RING } from "./SageLine";
import Slime from "./Slime";

const VISIBLE = 7;
/** Cards from this index on are hidden below 640px (5 cards + the end card). */
const PHONE_LIMIT = 5;

/**
 * The live Magic Sense grid: 7 soonest episodes (5 on phones) plus an end
 * card into the season. Aired rows drop out after hydration and later
 * candidates backfill in place, so the grid never shifts.
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
  const cards = useVisibleAiring(ids, VISIBLE);

  if (!cards.length) {
    return (
      <ReportPanel
        text="Those episodes just aired. Fresh countdowns are on the season page."
        actions={[{ href: seasonHref, label: `Browse ${seasonLabel}`, cta: "browse_season" }]}
      />
    );
  }

  const allLabel = `See all ${showCount ? `${showCount} ` : ""}${seasonLabel} shows`;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((media, index) => (
        <li key={media.id} className={index >= PHONE_LIMIT ? "hidden sm:flex" : "flex"}>
          <EpisodeCard
            media={media}
            variant="grid"
            location="airing_next"
            continuing={isContinuing(media.id)}
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
          <span className="text-xs text-[rgb(164,164,164)]">Sort by countdown or popularity</span>
          <span
            aria-hidden="true"
            className="mt-1 text-lg text-[#95ccff] transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </li>
    </ul>
  );
}

/**
 * One show counting down: cover, live chip, badge, title, meta and the add
 * button. `compact` (the Quest Log) drops the meta line and uses a smaller
 * title. Renders an <article>; wrap it in an <li> in lists.
 */
export function EpisodeCard({
  media,
  variant,
  location,
  continuing = false,
}: {
  media: AnimeMedia;
  variant: "grid" | "compact";
  location: LandingLocation;
  continuing?: boolean;
}) {
  const titleId = useId();
  const title = displayTitle(media);
  const next = nextAiring(media);
  const premiere = next?.episode === 1;
  const color = media.coverImage.color;
  const cover = media.coverImage.large ?? media.coverImage.medium ?? media.coverImage.extraLarge;
  const from = continuing && !premiere ? toSeasonLabel(media.season, media.seasonYear) : null;
  const studio = media.studios?.nodes?.find((node) => node.name)?.name ?? "Studio TBA";
  const meta = [formatLabel(media.format), studio].filter(Boolean).join(" · ");
  const compact = variant === "compact";

  return (
    <article
      aria-labelledby={titleId}
      style={{ "--card-glow": color ?? "rgba(93,174,241,.55)" } as CSSProperties}
      className="flex w-full flex-col overflow-hidden rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] transition-[border-color,box-shadow,transform] duration-200 focus-within:border-[#95ccff]/40 focus-within:shadow-[0_10px_30px_-12px_var(--card-glow)] hover:border-[#95ccff]/40 hover:shadow-[0_10px_30px_-12px_var(--card-glow)] focus-within:-translate-y-0.5 hover:-translate-y-0.5"
    >
      <div
        className="relative aspect-[2/3] w-full bg-[rgb(38,38,38)]"
        style={color ? { backgroundColor: color } : undefined}
      >
        {cover && (
          <Image
            src={cover}
            alt=""
            fill
            loading="lazy"
            sizes={compact ? "(min-width:640px) 22vw, 45vw" : "(min-width:1024px) 170px, (min-width:640px) 22vw, 45vw"}
            className="object-cover"
          />
        )}
        {next && (
          // Narrow cards wrap the chip onto two lines, where a pill would read as a
          // blob: rounded-lg until the cards are wide enough for one line. The
          // min width is capped too (min-width beats max-width on ~120px cards).
          <span className="absolute left-2 top-2 min-w-[min(7.5rem,calc(100%-1rem))] max-w-[calc(100%-1rem)] rounded-lg bg-black/70 px-2 py-1 text-[11px] font-bold leading-tight text-white lg:rounded-full">
            <CountdownText airingAt={next.airingAt} episode={next.episode} mode="chip" />
          </span>
        )}
        {(premiere || continuing) && (
          <span
            className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              premiere ? "bg-violet-600/90" : "bg-blue-600/90"
            }`}
          >
            {premiere ? "Premiere" : "Continuing"}
            {from && <span className="sr-only"> from {from}</span>}
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "p-2" : "p-3"}`}>
        <h3
          id={titleId}
          title={title}
          className={`line-clamp-2 font-semibold text-white ${compact ? "h-8 text-xs leading-4" : "h-10 text-sm leading-5"}`}
        >
          {title}
        </h3>
        {!compact && (
          <p className="mt-1 line-clamp-1 text-xs text-[rgb(164,164,164)]">{meta}</p>
        )}
        <div className="mt-auto pt-2">
          <LandingAddButton id={media.id} location={location} />
        </div>
      </div>
    </article>
  );
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
