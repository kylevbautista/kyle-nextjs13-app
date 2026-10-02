/**
 * The Great Sage's tracker lines: what the landing's TrackerDemo console says
 * and what My List's console toast says after a confirmed save. One source,
 * so the demo and the real page can't drift (tempest-theme rule 1). Pure, no
 * clock: callers pass in what they know.
 */
import { LIST_STATUS_LABELS, type UserAnimeData } from "./types";

/** A subset of the Great Sage's kinds (components/home/SageLine.tsx#SageKind). */
export type ConsoleKind = "Notice" | "Question" | "Answer";

export interface ConsoleMessage {
  kind: ConsoleKind;
  /** What's shown. */
  text: string;
  /** What's spoken, when "/" would read badly ("8.5 out of 10"). */
  spoken: string;
}

const line = (kind: ConsoleKind, text: string, spoken = text): ConsoleMessage => ({ kind, text, spoken });

/** Before anything has happened (the demo). */
export const PROMPT_MESSAGE = line("Question", "Watched the next one? Tap +1.");

/**
 * " Finish date set to today." only when the server filled it in: the request
 * carried no finish date and the saved data has one. (A +1 never sends dates,
 * so for a +1 the "sent" date is the previous one.)
 */
const finishClause = (sentFinishDate: number | null, next: UserAnimeData) =>
  sentFinishDate === null && next.finishDate !== null ? " Finish date set to today." : "";

/**
 * After a +1. `title` names the show (My List; the demo has one show and
 * omits it). `unlogged` is unloggedAired() before and after, when known.
 */
export function plusOneMessage({
  prev,
  next,
  episodes,
  title,
  unlogged,
}: {
  prev: UserAnimeData;
  next: UserAnimeData;
  episodes: number | null;
  title?: string;
  unlogged?: { before: number | null; after: number | null };
}): ConsoleMessage {
  const progress = next.episodeProgressNumber;
  if (next.listType === "completed" && prev.listType !== "completed") {
    return line(
      "Notice",
      `Final episode reached. ${title ? `${title} moved` : "Moved"} to Completed.${finishClause(prev.finishDate, next)}`
    );
  }
  const logged = `Episode ${progress} logged${title ? ` for ${title}` : ""}.`;
  if (next.listType === "watching" && (prev.listType === "planning" || prev.listType === "paused")) {
    return line("Notice", `Episode ${progress} logged. ${title ? `${title} moved` : "Moved"} to Watching.`);
  }
  if (unlogged && unlogged.before !== null && unlogged.before > 0 && unlogged.after === 0) {
    return line("Notice", `${logged} Caught up.`);
  }
  const total = episodes && episodes > 0 ? episodes : null;
  if (total === null) return line("Notice", logged);
  // A Dropped show isn't auto-completed: don't say "0 to go".
  return line("Notice", progress >= total ? `${logged} That's every episode.` : `${logged} ${total - progress} to go.`);
}

/**
 * After a status change. `sentFinishDate` is the finish date the request
 * carried (default: the previous one, as for the demo's status pills).
 */
export function statusMessage(
  prev: UserAnimeData,
  next: UserAnimeData,
  sentFinishDate: number | null = prev.finishDate
): ConsoleMessage {
  if (prev.listType === "completed" && next.listType === "watching") {
    const progress = next.episodeProgressNumber;
    return line(
      "Answer",
      progress === prev.episodeProgressNumber
        ? `Status set to Watching. Rewatching? Progress stays at ${progress}.`
        : `Status set to Watching. Rewatching? Progress set to ${progress}.`
    );
  }
  return line("Answer", `Status set to ${LIST_STATUS_LABELS[next.listType]}.${finishClause(sentFinishDate, next)}`);
}

/** After a score change. */
export function scoreMessage(next: UserAnimeData): ConsoleMessage {
  return next.score === null
    ? line("Notice", "Score cleared.")
    : line("Notice", `Score recorded: ${next.score} / 10.`, `Score recorded: ${next.score} out of 10.`);
}

/**
 * After an edit-dialog save: one line for the most important change (status,
 * then the finale, then progress, then score, then dates). `prev` is what the
 * dialog opened with, `sent` what was submitted, `next` what the server saved:
 * only `sent` vs `next` says what the server did on its own (auto-complete, a
 * filled-in finish date), so a typed date is never called "today".
 */
export function editMessage({
  prev,
  sent,
  next,
  episodes,
}: {
  prev: UserAnimeData;
  sent: UserAnimeData;
  next: UserAnimeData;
  episodes: number | null;
}): ConsoleMessage {
  if (next.listType !== prev.listType) {
    // The server completed it (progress reached the finale), not the status choice.
    if (next.listType === "completed" && sent.listType !== "completed") {
      return line("Notice", `Final episode reached. Moved to Completed.${finishClause(sent.finishDate, next)}`);
    }
    return statusMessage(prev, next, sent.finishDate);
  }
  if (next.episodeProgressNumber !== prev.episodeProgressNumber) {
    const total = episodes && episodes > 0 ? episodes : null;
    return line(
      "Notice",
      `Progress set to ${next.episodeProgressNumber}${total !== null ? ` / ${total}` : ""}.`,
      `Progress set to ${next.episodeProgressNumber}${total !== null ? ` of ${total}` : ""}.`
    );
  }
  if (next.score !== prev.score) return scoreMessage(next);
  if (next.startDate !== prev.startDate || next.finishDate !== prev.finishDate) {
    return line("Notice", "Dates updated.");
  }
  return line("Notice", "Saved. Nothing changed.");
}
