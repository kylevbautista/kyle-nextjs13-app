import type { ReactNode } from "react";
import Slime from "@/components/home/Slime";
import { LABEL_CLASS } from "@/components/theme/tokens";
import type { AiringFields, Weekday } from "@/lib/anime/airing";
import {
  laterHeading,
  scheduleTimeLine,
  scheduleWhen,
  showsNothingMoreToday,
  splitLaterWeeks,
} from "./schedule";

/**
 * The week panel's day pieces, shared by the Airing Schedule and the
 * landing's ScheduleDemo (CLAUDE.md §9.18: the demo matches the panel).
 * Hook-free: each panel passes its one clock (`now ?? renderedAt`, the demo's
 * `now ?? generatedAt`), and `relative={false}` while a cached page has no
 * live clock (absolute labels).
 */

// Each unit ("EP 9 ·", "Oct 22,", "9:30 AM PT") moves to the next line whole
// while it fits, and splits at its own spaces when the column is narrower
// (large text); a word wider than the whole column still breaks.
const UNIT = "inline-block max-w-full";

/** A row's air-time line: "EP 13 · Today 9:30 AM PT", "Premiere · Jan 7, 2027, 11:30 PM PT". */
export function ScheduleWhenLine({
  airingAt,
  episode,
  nowMs,
  relative = true,
}: {
  airingAt: number;
  episode: number | null;
  nowMs: number;
  relative?: boolean;
}) {
  const when = scheduleWhen(airingAt, nowMs, relative);
  const units = scheduleTimeLine(episode, when);
  const [episodeUnit, dayUnit, timeUnit] = units;
  // Chromium drops the spaces between inline-blocks from the accessibility
  // tree ("Oct 22,9:30 AM PT"), so screen readers get the sentence whole.
  return (
    <p className="break-words text-xs text-[rgb(164,164,164)]">
      <span aria-hidden="true">
        <span className={UNIT}>{episodeUnit}</span>{" "}
        <span className={when.kind === "today" ? `${UNIT} font-semibold text-[#95ccff]` : UNIT}>{dayUnit}</span>{" "}
        <span className={UNIT}>{timeUnit}</span>
      </span>
      <span className="sr-only">{units.join(" ")}</span>
    </p>
  );
}

/**
 * One weekday's rows: the coming ones, then a "Thursdays after today" /
 * "Fridays after Oct 16" divider and the rows a week or more out. On today's
 * weekday with nothing left today, `note` says so first. Other days with only
 * later rows open on the divider: a sentence about their date could be false
 * for a show filed under another weekday.
 */
export function ScheduleDay<T extends Partial<AiringFields>>({
  day,
  rows,
  nowMs,
  relative = true,
  heading: Heading,
  note,
  renderRows,
}: {
  day: Weekday;
  rows: readonly T[];
  nowMs: number;
  /** False while the page has no live clock: a dated divider and no note. */
  relative?: boolean;
  /** h3 in a day tab (under the panel's h2), h4 inside All's day sections. */
  heading: "h3" | "h4";
  note: string;
  /** One <ol> of rows; never called with an empty list. */
  renderRows: (rows: T[]) => ReactNode;
}) {
  const split = splitLaterWeeks(rows, nowMs);
  const { coming, later } = split;
  const showNote = showsNothingMoreToday(day, split, nowMs, relative);
  return (
    <>
      {coming.length > 0 && renderRows(coming)}
      {showNote && (
        <p className="flex min-h-16 items-center gap-3 px-1 py-2 text-sm text-[rgb(164,164,164)]">
          <span aria-hidden="true" className="flex w-10 shrink-0 justify-center">
            <Slime size={32} mood="sage" />
          </span>
          <span className="min-w-0">{note}</span>
        </p>
      )}
      {later.length > 0 && (
        <>
          <Heading
            className={`flex items-center gap-2 px-1 pb-1 ${coming.length || showNote ? "pt-4" : "pt-1"} ${LABEL_CLASS}`}
          >
            {laterHeading(day, nowMs, relative)}
            <span aria-hidden="true" className="h-0 min-w-6 flex-1 border-t border-dashed border-[#95ccff]/25" />
          </Heading>
          {renderRows(later)}
        </>
      )}
    </>
  );
}
