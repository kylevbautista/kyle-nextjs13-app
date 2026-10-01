"use client";
import { memo, useId, type CSSProperties } from "react";
import Image from "next/image";
import CountdownText from "@/components/home/CountdownText";
import Slime from "@/components/home/Slime";
import { CARD, FOCUS_RING_PANEL } from "@/components/theme/tokens";
import { airingStatusLabel, nextAiring } from "@/lib/anime/airing";
import { STATUS_BADGE_CLASS } from "@/lib/anime/statusBadge";
import { LIST_STATUS_LABELS, displayTitle, type UserAnimeData } from "@/lib/anime/types";
import { progressRatio } from "./listFilters";
import type { MyListEntry } from "./listFilters";

export const editButtonId = (animeId: number) => `edit-entry-${animeId}`;
export const incrementButtonId = (animeId: number) => `increment-entry-${animeId}`;

// Stored dates are UTC-midnight calendar days, so format them in UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Finished Apr 3, 2026" / "Started …" / "Not started" (the landing demo's line). */
function dateLine({ startDate, finishDate }: UserAnimeData) {
  if (finishDate) return `Finished ${dateFormat.format(finishDate)}`;
  if (startDate) return `Started ${dateFormat.format(startDate)}`;
  return "Not started";
}

/** The live countdown, or the release status when nothing is scheduled. */
function NextEpisode({ entry }: { entry: MyListEntry }) {
  const next = nextAiring(entry);
  if (!next) {
    return <p className="truncate text-xs text-[rgb(164,164,164)]">{airingStatusLabel(entry)}</p>;
  }
  return (
    <p className="text-xs font-semibold text-[#95ccff]">
      <CountdownText airingAt={next.airingAt} episode={next.episode} mode="row" />
    </p>
  );
}

interface ListCardProps {
  entry: MyListEntry;
  isOwner: boolean;
  /** A "+1" save for this entry is in flight. */
  pending: boolean;
  onIncrement: (entry: MyListEntry) => void;
  onEdit: (entry: MyListEntry) => void;
}

/**
 * One show on My List. It is the landing's tracker demo card
 * (components/home/TrackerDemo.tsx) made real: cover, title, status badge,
 * +1, "Ep 12 / 24" with its bar, and the date · score line, plus the live
 * countdown and Edit. Visitors get the same card without the buttons.
 */
export const ListCard = memo(function ListCard({
  entry,
  isOwner,
  pending,
  onIncrement,
  onEdit,
}: ListCardProps) {
  const titleId = useId();
  const title = displayTitle(entry);
  const { listType, episodeProgressNumber: progress, score } = entry.userData;
  const total = entry.episodes && entry.episodes > 0 ? entry.episodes : null;
  const ratio = progressRatio(entry);
  const atLastEpisode = total !== null && progress >= total;
  const incrementBlocked = atLastEpisode || pending;
  const color = entry.coverImage?.color ?? null;
  const cover =
    entry.coverImage?.large ?? entry.coverImage?.extraLarge ?? entry.coverImage?.medium ?? null;

  return (
    <li className="flex min-w-0">
      <article
        aria-labelledby={titleId}
        style={{ "--card-glow": color ?? "rgba(93,174,241,.55)" } as CSSProperties}
        className={`grid w-full min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-4 p-4 text-white animate-[rise-in_400ms_ease-out_both] ${CARD}`}
      >
        <div
          className="relative flex h-[104px] w-[72px] items-center justify-center overflow-hidden rounded-md bg-[rgb(38,38,38)]"
          style={color ? { backgroundColor: color } : undefined}
        >
          {cover ? (
            <Image src={cover} alt="" fill sizes="72px" className="object-cover" />
          ) : (
            <Slime size={40} animated={false} />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
              <h3 id={titleId} className="text-sm font-semibold leading-5">
                <a
                  href={`https://anilist.co/anime/${entry.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={title}
                  className={`line-clamp-2 break-words rounded-sm hover:text-[#95ccff] hover:underline ${FOCUS_RING_PANEL}`}
                >
                  {title}
                  <span className="sr-only"> (opens AniList in a new tab)</span>
                </a>
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_BADGE_CLASS[listType]}`}
              >
                {LIST_STATUS_LABELS[listType]}
              </span>
            </div>
            {isOwner && (
              <button
                id={incrementButtonId(entry.id)}
                type="button"
                onClick={() => {
                  if (!incrementBlocked) onIncrement(entry);
                }}
                aria-disabled={incrementBlocked || undefined}
                aria-busy={pending || undefined}
                aria-label={atLastEpisode ? `All episodes of ${title} watched` : `+1 episode: ${title}`}
                title={atLastEpisode ? "All episodes watched" : "Mark the next episode as watched"}
                className={`inline-flex h-11 w-16 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors aria-busy:animate-pulse md:h-10 ${FOCUS_RING_PANEL} ${
                  atLastEpisode
                    ? "cursor-default bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/40"
                    : "bg-blue-600 text-white hover:bg-blue-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-blue-600"
                }`}
              >
                {atLastEpisode ? <span aria-hidden="true">✓</span> : "+1"}
              </button>
            )}
          </div>

          <NextEpisode entry={entry} />

          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-[rgb(164,164,164)]">
              Ep <span className="font-semibold tabular-nums text-white">{progress}</span> / {total ?? "?"}
              <span className="sr-only"> episodes watched</span>
            </p>
            <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(53,53,53)]">
              {ratio !== null && (
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-300 ${
                    listType === "completed" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              )}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2">
            <p className="min-w-0 text-xs text-[rgb(164,164,164)]">
              {dateLine(entry.userData)} ·{" "}
              <span className="whitespace-nowrap">
                Score{" "}
                <span className="font-semibold tabular-nums text-white">
                  {score ?? "—"}
                  {score !== null && <span className="sr-only"> out of 10</span>}
                </span>
              </span>
            </p>
            {isOwner && (
              <button
                id={editButtonId(entry.id)}
                type="button"
                onClick={() => onEdit(entry)}
                aria-haspopup="dialog"
                aria-label={`Edit ${title}`}
                className={`inline-flex h-11 shrink-0 items-center rounded-lg border border-[#95ccff]/30 bg-white/5 px-3 text-xs font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 md:h-8 ${FOCUS_RING_PANEL}`}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
});
