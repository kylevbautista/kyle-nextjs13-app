"use client";
import { memo } from "react";
import Image from "next/image";
import { useNow } from "@/components/utils/useNow";
import {
  airingStatusLabel,
  formatAirDate,
  formatCountdown,
  nextAiring,
  secondsUntil,
} from "@/lib/anime/airing";
import { LIST_STATUS_LABELS, displayTitle } from "@/lib/anime/types";
import type { ListStatus } from "@/lib/anime/types";
import { progressRatio } from "./listFilters";
import type { MyListEntry } from "./listFilters";

export const editButtonId = (animeId: number) => `edit-entry-${animeId}`;
export const incrementButtonId = (animeId: number) => `increment-entry-${animeId}`;

export const STATUS_BADGE_CLASS: Record<ListStatus, string> = {
  watching: "bg-blue-500/20 text-blue-200 ring-blue-400/40",
  planning: "bg-violet-500/20 text-violet-200 ring-violet-400/40",
  completed: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
  paused: "bg-amber-500/20 text-amber-200 ring-amber-400/40",
  dropped: "bg-rose-500/20 text-rose-200 ring-rose-400/40",
};

const buttonBase =
  "inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

/** Ticks once a second; isolated so only this line re-renders. */
function NextEpisode({ entry }: { entry: MyListEntry }) {
  const now = useNow();
  const next = nextAiring(entry);

  if (!next) {
    return <p className="text-xs text-[rgb(164,164,164)]">{airingStatusLabel(entry)}</p>;
  }

  const episode = next.episode ? `EP ${next.episode}` : "Next episode";
  const seconds = now === null ? null : secondsUntil(next.airingAt, now);
  return (
    <p className="text-xs text-[#95ccff]">
      <time
        dateTime={new Date(next.airingAt * 1000).toISOString()}
        title={formatAirDate(next.airingAt)}
      >
        {episode}{" "}
        {seconds === null ? (
          // Same markup on the server and during hydration; the time fills in after.
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-24 animate-pulse rounded-full bg-[rgb(53,53,53)] align-middle"
          />
        ) : seconds > 0 ? (
          `in ${formatCountdown(seconds)}`
        ) : (
          "has aired"
        )}
      </time>
    </p>
  );
}

interface ListCardProps {
  entry: MyListEntry;
  isOwner: boolean;
  /** Show the list-status badge (the "All" view). */
  showStatus: boolean;
  /** A "+1" save for this entry is in flight. */
  pending: boolean;
  onIncrement: (entry: MyListEntry) => void;
  onEdit: (entry: MyListEntry) => void;
}

export const ListCard = memo(function ListCard({
  entry,
  isOwner,
  showStatus,
  pending,
  onIncrement,
  onEdit,
}: ListCardProps) {
  const title = displayTitle(entry);
  const { listType, episodeProgressNumber: progress, score } = entry.userData;
  const total = entry.episodes && entry.episodes > 0 ? entry.episodes : null;
  const ratio = progressRatio(entry);
  const atLastEpisode = total !== null && progress >= total;
  const incrementBlocked = atLastEpisode || pending;
  const cover =
    entry.coverImage?.large ?? entry.coverImage?.extraLarge ?? entry.coverImage?.medium ?? null;

  return (
    <li className="flex">
      <article className="flex w-full overflow-hidden rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] text-white">
        <div
          className="relative min-h-[150px] w-[96px] shrink-0 bg-[rgb(38,38,38)]"
          style={entry.coverImage?.color ? { backgroundColor: entry.coverImage.color } : undefined}
        >
          {cover ? (
            <Image
              src={cover}
              alt={`Cover art for ${title}`}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-[rgb(164,164,164)]">
              No cover
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <h3 className="text-sm font-semibold leading-snug">
            <a
              href={`https://anilist.co/anime/${entry.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 rounded-sm hover:text-[#95ccff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
            >
              {title}
              <span className="sr-only"> (opens AniList in a new tab)</span>
            </a>
          </h3>

          <NextEpisode entry={entry} />

          {(showStatus || score !== null) && (
            <div className="flex flex-wrap gap-1.5">
              {showStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_BADGE_CLASS[listType]}`}
                >
                  {LIST_STATUS_LABELS[listType]}
                </span>
              )}
              {score !== null && (
                <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[11px] font-medium text-yellow-200 ring-1 ring-inset ring-yellow-300/40">
                  <span aria-hidden="true">★ </span>
                  <span className="sr-only">My score: </span>
                  {score}
                  <span className="sr-only"> out of 10</span>
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-1">
            <p className="text-xs text-[rgb(164,164,164)]">
              <span className="font-semibold text-white">{progress}</span> / {total ?? "?"}
              <span className="sr-only"> episodes watched</span>
              <span aria-hidden="true"> eps</span>
            </p>
            {ratio !== null && (
              <div
                aria-hidden="true"
                className="h-1 w-full overflow-hidden rounded-full bg-[rgb(53,53,53)]"
              >
                <div
                  className={`h-full rounded-full ${
                    listType === "completed" ? "bg-emerald-400" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            )}
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <button
                id={incrementButtonId(entry.id)}
                type="button"
                onClick={() => {
                  if (!incrementBlocked) onIncrement(entry);
                }}
                aria-disabled={incrementBlocked || undefined}
                aria-busy={pending || undefined}
                aria-label={`+1 ep: ${title}`}
                title={atLastEpisode ? "All episodes watched" : "Mark the next episode as watched"}
                className={`${buttonBase} bg-blue-600 hover:bg-blue-500 aria-disabled:hover:bg-blue-600`}
              >
                +1 ep
              </button>
              <button
                id={editButtonId(entry.id)}
                type="button"
                onClick={() => onEdit(entry)}
                aria-haspopup="dialog"
                aria-label={`Edit ${title}`}
                className={`${buttonBase} border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] hover:bg-[rgb(53,53,53)]`}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </article>
    </li>
  );
});
