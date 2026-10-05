"use client";
import { memo, useId, useState, type CSSProperties } from "react";
import Image from "next/image";
import Slime from "@/components/home/Slime";
import NewEpisodesChip from "@/components/theme/NewEpisodesChip";
import NextEpisodeLine from "@/components/theme/NextEpisodeLine";
import UndoButton from "@/components/theme/UndoButton";
import { BAR_SHEEN, CARD, FOCUS_RING_PANEL, PLUS_ONE_SAVING_DOT } from "@/components/theme/tokens";
import { STATUS_BADGE_CLASS } from "@/lib/anime/statusBadge";
import type { CardActivity } from "@/lib/anime/trackQueue";
import { undoLabel, undoTitle } from "@/lib/anime/trackerConsole";
import { LIST_STATUS_LABELS, displayTitle, type UserAnimeData } from "@/lib/anime/types";
import { progressRatio } from "./listFilters";
import type { MyListEntry } from "./listFilters";

export const editButtonId = (animeId: number) => `edit-entry-${animeId}`;
export const incrementButtonId = (animeId: number) => `increment-entry-${animeId}`;
export const undoButtonId = (animeId: number) => `undo-entry-${animeId}`;

// Stored dates are UTC-midnight calendar days, so format them in UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * "Finished Apr 3, 2026" / "Started …" (the landing demo's line). Without
 * dates, "Not started" only when nothing is logged yet: legacy entries and
 * cleared dates can have progress.
 */
function dateLine({ startDate, finishDate, episodeProgressNumber, listType }: UserAnimeData) {
  if (finishDate) return `Finished ${dateFormat.format(finishDate)}`;
  if (startDate) return `Started ${dateFormat.format(startDate)}`;
  return episodeProgressNumber > 0 || listType === "completed" ? "No start date" : "Not started";
}

interface ListCardProps {
  entry: MyListEntry;
  isOwner: boolean;
  /** The owner's first name on a visitor's view (for the "N new" chip's spoken text). */
  ownerName: string | null;
  /** The page's server render time (the chip's reference until the clock hydrates). */
  renderedAt: number;
  /** The card's +1 engine state (lib/anime/trackQueue.ts): saving dot, motion, Undo. Null when idle. */
  activity: CardActivity | null;
  onIncrement: (entry: MyListEntry) => void;
  /** "Log N new": `count` is what the chip showed. */
  onCatchUp: (entry: MyListEntry, count: number, button: HTMLButtonElement) => void;
  onUndo: (entry: MyListEntry) => void;
  onUndoExpire: (animeId: number) => void;
  onEdit: (entry: MyListEntry) => void;
}

/**
 * One show on My List. It is the landing's tracker demo card
 * (components/home/TrackerDemo.tsx) made real: cover, title, status badge,
 * +1, "Ep 12 / 24" with its bar, and the date · score line, plus the live
 * countdown and Edit. The owner's +1 never blocks while saving (taps queue up),
 * the "N new" chip becomes "Log N new", and after a confirmed change "↶ Undo +N"
 * takes the date line's place for a few seconds. Visitors get the same card
 * without the buttons.
 */
export const ListCard = memo(function ListCard({
  entry,
  isOwner,
  ownerName,
  renderedAt,
  activity,
  onIncrement,
  onCatchUp,
  onUndo,
  onUndoExpire,
  onEdit,
}: ListCardProps) {
  const titleId = useId();
  const title = displayTitle(entry);
  const { listType, episodeProgressNumber: progress, score } = entry.userData;
  const total = entry.episodes && entry.episodes > 0 ? entry.episodes : null;
  const ratio = progressRatio(entry);
  const atLastEpisode = total !== null && progress >= total;
  // The number rolls up only when it goes up (not on an Undo or a rollback): the last
  // progress seen, kept from the previous render (React's "adjust state while rendering").
  const [shown, setShown] = useState({ progress, up: false });
  if (shown.progress !== progress) setShown({ progress, up: progress > shown.progress });
  // Alternating two identical keyframes restarts the squish on every tap.
  const poke = activity && activity.taps > 0 ? (activity.taps % 2 ? "animate-slime-poke" : "animate-slime-poke-2") : "";
  const color = entry.coverImage?.color ?? null;
  const cover =
    entry.coverImage?.large ?? entry.coverImage?.extraLarge ?? entry.coverImage?.medium ?? null;

  return (
    // The rise-in sits on the <li>: on the card, its fill-mode would pin `transform`
    // and cancel CARD's hover/focus lift.
    <li className="flex min-w-0 animate-[rise-in_400ms_ease-out_both]">
      <article
        aria-labelledby={titleId}
        data-track-card={entry.id}
        style={{ "--card-glow": color ?? "rgba(93,174,241,.55)" } as CSSProperties}
        className={`grid w-full min-w-0 grid-cols-1 gap-4 p-4 text-white min-[360px]:grid-cols-[72px_minmax(0,1fr)] ${CARD}`}
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
                  if (!atLastEpisode) onIncrement(entry);
                }}
                // A held Enter logs one episode, not an auto-repeat stream.
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
                aria-disabled={atLastEpisode || undefined}
                // Starts with the visible "+1" (WCAG 2.5.3) and stays the same between
                // presses, so screen readers hear only the result line.
                aria-label={atLastEpisode ? `All episodes of ${title} watched` : `+1: log the next episode of ${title}`}
                title={atLastEpisode ? "All episodes watched" : "Mark the next episode as watched"}
                className={`relative inline-flex h-11 w-16 shrink-0 touch-manipulation items-center justify-center rounded-lg text-sm font-bold transition-colors md:h-10 ${poke} ${FOCUS_RING_PANEL} ${
                  atLastEpisode
                    ? "cursor-default bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/40"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                {atLastEpisode ? <span aria-hidden="true">✓</span> : "+1"}
                {activity?.saving && <span aria-hidden="true" className={PLUS_ONE_SAVING_DOT} />}
              </button>
            )}
          </div>

          <NextEpisodeLine media={entry} />

          <div className="flex flex-col gap-1.5">
            <div className="flex min-h-5 items-center justify-between gap-2">
              <p className="min-w-0 text-xs text-[rgb(164,164,164)]">
                <span aria-hidden="true">
                  Ep{" "}
                  <span
                    key={progress}
                    className={`font-semibold tabular-nums text-white ${activity && shown.up ? "inline-block animate-tick" : ""}`}
                  >
                    {progress}
                  </span>{" "}
                  / {total ?? "?"}
                </span>
                <span className="sr-only">
                  {progress} of {total ?? "an unknown number of"} episodes watched
                </span>
              </p>
              <NewEpisodesChip
                media={entry}
                ownerName={isOwner ? null : ownerName}
                renderedAt={renderedAt}
                title={title}
                onCatchUp={isOwner ? (count, button) => onCatchUp(entry, count, button) : undefined}
              />
            </div>
            <div aria-hidden="true" className="relative h-1.5 w-full overflow-hidden rounded-full bg-[rgb(53,53,53)]">
              {ratio !== null ? (
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-300 ${
                    listType === "completed" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              ) : (
                // Unknown episode count: a dashed track, so it can't read as 0%.
                <div className="h-full w-full bg-[repeating-linear-gradient(90deg,rgba(149,204,255,.3)_0_6px,transparent_6px_12px)]" />
              )}
              {activity?.justCompleted && ratio !== null && <span aria-hidden="true" className={BAR_SHEEN} />}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2">
            {/* Undo takes the date line's place (same height as Edit), so nothing below moves. */}
            {isOwner && activity?.undo ? (
              <UndoButton
                id={undoButtonId(entry.id)}
                undo={activity.undo}
                label={undoLabel({
                  n: activity.undo.n,
                  restore: activity.undo.restore,
                  current: entry.userData,
                  episodes: entry.episodes,
                  title,
                })}
                title={undoTitle({ restore: activity.undo.restore, current: entry.userData, episodes: entry.episodes })}
                onUndo={() => onUndo(entry)}
                onExpire={() => onUndoExpire(entry.id)}
              />
            ) : (
              <p className="min-w-0 text-xs text-[rgb(164,164,164)]">
                {dateLine(entry.userData)}{" "}
                <span className="whitespace-nowrap">
                  · Score{" "}
                  <span className="font-semibold tabular-nums text-white">
                    {score ?? "—"}
                    {score !== null && <span className="sr-only"> out of 10</span>}
                  </span>
                </span>
              </p>
            )}
            {isOwner && (
              <button
                id={editButtonId(entry.id)}
                type="button"
                onClick={() => onEdit(entry)}
                aria-haspopup="dialog"
                aria-label={`Edit ${title}`}
                className={`inline-flex h-11 shrink-0 items-center rounded-lg border border-[#95ccff]/30 bg-white/5 px-3 text-xs font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 md:h-9 ${FOCUS_RING_PANEL}`}
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
