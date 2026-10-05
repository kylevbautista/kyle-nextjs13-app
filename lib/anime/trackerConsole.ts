/**
 * The Great Sage's tracker lines: what the landing's TrackerDemo console says
 * and what My List's console toast says after a confirmed save. One source,
 * so the demo and the real page can't drift (tempest-theme rule 1). Pure, no
 * clock: callers pass in what they know.
 */
import { LIST_STATUS_LABELS, type UserAnimeData } from "./types";

/** A subset of the Great Sage's kinds (components/home/SageLine.tsx#SageKind). */
export type ConsoleKind = "Notice" | "Question" | "Answer" | "Warning";

/** Why a save or an undo failed (lib/anime/trackQueue.ts#SaveError). */
export type FailReason = "offline" | "server" | "busy" | "signedOut" | "notOnList" | "invalid" | "changed";

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

const knownTotal = (episodes: number | null) => (episodes && episodes > 0 ? episodes : null);

/** "Ep 11 / 24", or "Ep 1353" when the total is unknown. */
const ep = (progress: number, total: number | null) => `Ep ${progress}${total !== null ? ` / ${total}` : ""}`;
/** "episode 11 of 24" / "episode 1353". */
const epSpoken = (progress: number, total: number | null) =>
  `episode ${progress}${total !== null ? ` of ${total}` : ""}`;

/**
 * The episodes a burst logged, from `first` to `last`: "Episode 13",
 * "Episodes 12–13" (spoken "Episodes 12 and 13"), "Episodes 12–14" (spoken
 * "Episodes 12 to 14").
 */
function range(first: UserAnimeData, last: UserAnimeData) {
  const from = first.episodeProgressNumber + 1;
  const to = last.episodeProgressNumber;
  const count = to - from + 1;
  if (count <= 1) return { text: `Episode ${to}`, spoken: `Episode ${to}` };
  return {
    text: `Episodes ${from}–${to}`,
    spoken: count === 2 ? `Episodes ${from} and ${to}` : `Episodes ${from} to ${to}`,
  };
}

/** Builds a line whose text and spoken forms differ only in the parts given both ways. */
const both = (kind: ConsoleKind, build: (form: "text" | "spoken") => string): ConsoleMessage =>
  line(kind, build("text"), build("spoken"));

/**
 * After a +1, or a burst of them (a catch-up included): `prev` is the value
 * before the first episode, `next` after the last. One episode keeps the
 * demo's words ("Episode 23 logged. 1 to go."); more name the range.
 * `title` names the show (My List; the demo has one show and omits it).
 * `unlogged` is unloggedAired() before and after, when known.
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
  const logged = range(prev, next);
  const forTitle = title ? ` for ${title}` : "";
  if (next.listType === "watching" && (prev.listType === "planning" || prev.listType === "paused")) {
    return both("Notice", (form) => `${logged[form]} logged. ${title ? `${title} moved` : "Moved"} to Watching.`);
  }
  // Caught up = the burst ended exactly on the last aired episode (not past it: +1 may log unaired ones).
  if (
    unlogged &&
    unlogged.before !== null &&
    unlogged.before > 0 &&
    unlogged.after === 0 &&
    next.episodeProgressNumber - prev.episodeProgressNumber === unlogged.before
  ) {
    return both("Notice", (form) => `${logged[form]} logged${forTitle}. Caught up.`);
  }
  const total = knownTotal(episodes);
  if (total === null) return both("Notice", (form) => `${logged[form]} logged${forTitle}.`);
  // A Dropped show isn't auto-completed: don't say "0 to go".
  const rest = progress >= total ? "That's every episode." : `${total - progress} to go.`;
  return both("Notice", (form) => `${logged[form]} logged${forTitle}. ${rest}`);
}

/** True whether the page's last known value came from loading, a re-read or its own save. */
const CHANGED_SINCE = "It had changed since this page last checked";

/**
 * A burst whose save found the stored value had moved on (another tab or
 * device, or this page's own unconfirmed write): the range counts only what
 * this page logged on top of the value the server held.
 */
export function staleMessage({
  first,
  last,
  episodes,
  title,
}: {
  first: UserAnimeData;
  last: UserAnimeData;
  episodes: number | null;
  title?: string;
}): ConsoleMessage {
  const total = knownTotal(episodes);
  const now = (form: "text" | "spoken") =>
    form === "text" ? ep(last.episodeProgressNumber, total) : epSpoken(last.episodeProgressNumber, total);
  const forTitle = title ? ` for ${title}` : "";
  if (last.episodeProgressNumber <= first.episodeProgressNumber) {
    return both("Notice", (form) => `Nothing logged${forTitle}. ${CHANGED_SINCE}: now ${now(form)}.`);
  }
  const logged = range(first, last);
  return both("Notice", (form) => `${logged[form]} logged${forTitle}. ${CHANGED_SINCE}: now ${now(form)}.`);
}

/** A burst that logged nothing: a catch-up with nothing aired yet by the server's clock, or already at the end. */
export function noChangeMessage({
  current,
  episodes,
  title,
  notAired,
}: {
  current: UserAnimeData;
  episodes: number | null;
  title?: string;
  notAired: boolean;
}): ConsoleMessage {
  const total = knownTotal(episodes);
  const at = (form: "text" | "spoken") =>
    form === "text" ? ep(current.episodeProgressNumber, total) : epSpoken(current.episodeProgressNumber, total);
  return notAired
    ? both("Notice", (form) => `Nothing logged: no new episode has aired yet. ${title ?? "It"} is at ${at(form)}.`)
    : both("Notice", (form) => `Nothing logged: ${title ?? "it"} is already at ${at(form)}.`);
}

/**
 * One line for a finished burst (lib/anime/trackQueue.ts): the finale first,
 * then a stale save, then "nothing logged", then the +1 line for the range.
 */
export function burstMessage({
  first,
  last,
  stale,
  catchUp,
  episodes,
  title,
  unlogged,
}: {
  first: UserAnimeData;
  last: UserAnimeData;
  stale: boolean;
  catchUp: boolean;
  episodes: number | null;
  title?: string;
  unlogged?: { before: number | null; after: number | null };
}): ConsoleMessage {
  if (last.listType === "completed" && first.listType !== "completed") {
    return plusOneMessage({ prev: first, next: last, episodes, title, unlogged });
  }
  if (stale) return staleMessage({ first, last, episodes, title });
  if (last.episodeProgressNumber <= first.episodeProgressNumber) {
    const total = knownTotal(episodes);
    return noChangeMessage({
      current: last,
      episodes,
      title,
      notAired: catchUp && (total === null || last.episodeProgressNumber < total),
    });
  }
  return plusOneMessage({ prev: first, next: last, episodes, title, unlogged });
}

/** " Start date cleared." / " Finish date cleared." / " Dates cleared." when Undo removed an auto-filled date. */
function clearedDates(from: UserAnimeData, restored: UserAnimeData) {
  const start = from.startDate !== null && restored.startDate === null;
  const finish = from.finishDate !== null && restored.finishDate === null;
  if (start && finish) return " Dates cleared.";
  if (start) return " Start date cleared.";
  if (finish) return " Finish date cleared.";
  return "";
}

/**
 * After a confirmed Undo: `from` is what it replaced, `restored` what the
 * server saved. `stale`: the save the Undo waited on found another writer's
 * change, so it went back to that value, not to what the button showed.
 */
export function undoMessage({
  from,
  restored,
  episodes,
  title,
  stale = false,
}: {
  from: UserAnimeData;
  restored: UserAnimeData;
  episodes: number | null;
  title?: string;
  stale?: boolean;
}): ConsoleMessage {
  const total = knownTotal(episodes);
  const progress = restored.episodeProgressNumber;
  const at = (form: "text" | "spoken") => (form === "text" ? ep(progress, total) : epSpoken(progress, total));
  const subject = stale
    ? `${CHANGED_SINCE.charAt(0).toLowerCase()}${CHANGED_SINCE.slice(1)}: ${title ? `${title} is back` : "back"}`
    : title
      ? `${title} is back`
      : "Back";
  if (stale) {
    // "Undone, but it had changed since this page last checked: Frieren is back to Ep 20 / 26."
    const dates = clearedDates(from, restored);
    if (restored.listType === from.listType) return both("Answer", (form) => `Undone, but ${subject} to ${at(form)}.${dates}`);
    const status = LIST_STATUS_LABELS[restored.listType];
    return both("Answer", (form) => `Undone, but ${subject} in ${status} at ${at(form)}.${dates}`);
  }
  const dates = clearedDates(from, restored);
  if (restored.listType === from.listType) {
    return both("Answer", (form) => `Undone. ${subject} to ${at(form)}.${dates}`);
  }
  const status = LIST_STATUS_LABELS[restored.listType];
  if (progress === 0) return line("Answer", `Undone. ${subject} in ${status}, no episodes logged.${dates}`);
  return both("Answer", (form) => `Undone. ${subject} in ${status} at ${at(form)}.${dates}`);
}

const REASON_TEXT: Record<FailReason, string> = {
  signedOut: "you're signed out",
  invalid: "the server refused it",
  changed: CHANGED_SINCE.charAt(0).toLowerCase() + CHANGED_SINCE.slice(1),
  offline: "no connection",
  server: "the server had a problem",
  busy: "your list changed while saving",
  notOnList: "it isn't on your list anymore",
};

/**
 * A save or an undo that failed. `rejected`: the server said no, and `current`
 * is the value the card went back to. `checked` / `unchecked`: the outcome
 * couldn't be known (no response), so the page read the list again (`checked`,
 * `current` = what it found) or couldn't (`unchecked`, `current` = the last
 * confirmed value). `undoDropped`: an Undo was waiting on that save and wasn't
 * sent.
 */
export function failedMessage({
  action,
  outcome,
  reason = "server",
  undoDropped = false,
  current,
  episodes,
  title,
}: {
  action: "save" | "undo";
  outcome: "rejected" | "checked" | "unchecked";
  reason?: FailReason;
  undoDropped?: boolean;
  current: UserAnimeData | null;
  episodes: number | null;
  title?: string;
}): ConsoleMessage {
  const total = knownTotal(episodes);
  const at = (form: "text" | "spoken") =>
    current === null
      ? ""
      : form === "text"
        ? ep(current.episodeProgressNumber, total)
        : epSpoken(current.episodeProgressNumber, total);
  if (outcome === "rejected" && reason === "notOnList") {
    return line("Warning", `Couldn't ${action}: ${title ?? "this show"} isn't on your list anymore. Reload to update it.`);
  }
  const subject = title ?? "It";
  const dropped = undoDropped && action === "save" ? ", so Undo wasn't sent" : "";
  if (outcome === "rejected") {
    return both(
      "Warning",
      (form) => `Couldn't ${action}: ${REASON_TEXT[reason]}${dropped}.${current ? ` ${subject} is at ${at(form)}.` : ""}`
    );
  }
  if (outcome === "checked") {
    return both("Warning", (form) => `Couldn't confirm the ${action}${dropped}. Checked again: ${subject} is at ${at(form)}.`);
  }
  return both(
    "Warning",
    (form) =>
      `Couldn't confirm the ${action}${dropped}.${current ? ` ${subject} was last confirmed at ${at(form)}.` : ""} Reload to check.`
  );
}

/** "episode 1213" / "episodes 1354 and 1355" / "episodes 1213 to 1215". */
function episodesPhrase(from: number, count: number) {
  if (count <= 1) return `episode ${from}`;
  const to = from + count - 1;
  return count === 2 ? `episodes ${from} and ${to}` : `episodes ${from} to ${to}`;
}

/** The "Log N new" chip's accessible name (starts with its visible text, WCAG 2.5.3). */
export function catchUpLabel({
  count,
  from,
  title,
  demo = false,
}: {
  count: number;
  from: number;
  title?: string;
  demo?: boolean;
}) {
  const of = title && !demo ? ` of ${title}` : "";
  return `Log ${count} new: mark ${episodesPhrase(from, count)}${of} as watched${demo ? " (demo)" : ""}`;
}

/** Where Undo puts the show: "back to 11 of 24 episodes" / "back in Watching at episode 1353". */
function undoTarget(restore: UserAnimeData, current: UserAnimeData, total: number | null) {
  const progress = restore.episodeProgressNumber;
  const at = total !== null ? `${progress} of ${total} episodes` : `episode ${progress}`;
  if (restore.listType === current.listType) return `back to ${at}`;
  const status = LIST_STATUS_LABELS[restore.listType];
  return progress === 0 ? `back in ${status}, no episodes logged` : `back in ${status} at ${at}`;
}

/** Undo's accessible name: "Undo +2: put Frieren back to 11 of 24 episodes" (starts with its visible text). */
export function undoLabel({
  n,
  restore,
  current,
  episodes,
  title,
  demo = false,
}: {
  n: number;
  restore: UserAnimeData;
  current: UserAnimeData;
  episodes: number | null;
  title?: string;
  demo?: boolean;
}) {
  const target = undoTarget(restore, current, knownTotal(episodes));
  if (demo || !title) return `Undo +${n}: ${target}${demo ? " (demo)" : ""}`;
  return `Undo +${n}: put ${title} ${target}`;
}

/** Undo's tooltip: "Back to Ep 11 / 24", plus the status when it changes back. */
export function undoTitle({
  restore,
  current,
  episodes,
}: {
  restore: UserAnimeData;
  current: UserAnimeData;
  episodes: number | null;
}) {
  const at = `Back to ${ep(restore.episodeProgressNumber, knownTotal(episodes))}`;
  return restore.listType === current.listType ? at : `${at}, ${LIST_STATUS_LABELS[restore.listType]}`;
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
