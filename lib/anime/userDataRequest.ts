/**
 * The four bodies PATCH /api/anime-list/<id>/user-data accepts, and what each
 * one does to a stored entry. Pure and client-safe: the route applies these to
 * the value it read (server/lib/userDataWrite.ts), and the landing's
 * TrackerDemo applies the same functions locally, so the demo can't drift.
 *
 * - `{userData}`: an absolute write (the Edit dialog, old bundles).
 * - `{userData, expect}`: Undo. Applies only while the stored value still
 *   equals `expect`, so it never erases another tab's or device's change.
 * - `{increment: k}`: +1 taps. Applied to the stored progress, never to the
 *   number a (possibly stale) page shows, and never past what has aired by
 *   the server's clock.
 * - `{catchUpTo: E}`: the "Log N new" chip. Logs up to episode E, but never
 *   past what has aired by the server's clock.
 */
import { airedEpisodes, unloggedAired, type AiringFields } from "./airing";
import { MAX_EPISODES, normalizeUserData } from "./normalize";
import { isListStatus, type UserAnimeData } from "./types";

/** Taps merged into one request, at most. */
export const MAX_INCREMENT = 100;
export const MAX_CATCH_UP_TO = MAX_EPISODES;

export const REQUIRED_ERROR = "User data and anime ID are required";
export const CHANGED_ERROR = "This show changed elsewhere, so nothing was saved.";
export const BUSY_ERROR = "Your list changed while saving. Try again.";

export type ProgressRequest =
  | { kind: "increment"; increment: number }
  | { kind: "catchUp"; catchUpTo: number };

export type UserDataRequest =
  /** `userData` is unchecked here: normalizeUserData validates it. */
  | { kind: "set"; userData: unknown; expect: UserAnimeData | null }
  | ProgressRequest;

/** A stored entry, a My List entry or the demo's show: its schedule and the viewer's userData. */
export type TrackEntry = Partial<AiringFields> & { userData: UserAnimeData };

export type ApplyResult =
  | { ok: true; value: UserAnimeData; changed: boolean }
  | { ok: false; error: string; code?: "changed" };

const isObj = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberOrNull = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

/** A complete, well-formed userData (responses, Undo's `expect`). */
export function isUserAnimeData(value: unknown): value is UserAnimeData {
  if (!isObj(value)) return false;
  const progress = value.episodeProgressNumber;
  return (
    isListStatus(value.listType) &&
    typeof progress === "number" &&
    Number.isSafeInteger(progress) &&
    progress >= 0 &&
    numberOrNull(value.startDate) &&
    numberOrNull(value.finishDate) &&
    numberOrNull(value.score)
  );
}

export const sameUserData = (a: UserAnimeData, b: UserAnimeData) =>
  a.listType === b.listType &&
  a.episodeProgressNumber === b.episodeProgressNumber &&
  a.startDate === b.startDate &&
  a.finishDate === b.finishDate &&
  a.score === b.score;

/** The request body for a progress request. */
export const progressBody = (op: ProgressRequest): { increment: number } | { catchUpTo: number } =>
  op.kind === "increment" ? { increment: op.increment } : { catchUpTo: op.catchUpTo };

const wholeIn = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= max;

/** Validates a PATCH body. Error strings are the API's (clients show their own lines). */
export function parseUserDataRequest(
  body: unknown
): { ok: true; request: UserDataRequest } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: REQUIRED_ERROR };
  const { userData, expect, increment, catchUpTo } = body;

  if (increment !== undefined || catchUpTo !== undefined) {
    if (userData !== undefined) return { ok: false, error: "Send userData or an increment, not both" };
    if (expect !== undefined) return { ok: false, error: "expect only goes with userData" };
    if (increment !== undefined && catchUpTo !== undefined) {
      return { ok: false, error: "Send increment or catchUpTo, not both" };
    }
    if (increment !== undefined) {
      return wholeIn(increment, MAX_INCREMENT)
        ? { ok: true, request: { kind: "increment", increment } }
        : { ok: false, error: `Increment must be a whole number from 1 to ${MAX_INCREMENT}` };
    }
    return wholeIn(catchUpTo, MAX_CATCH_UP_TO)
      ? { ok: true, request: { kind: "catchUp", catchUpTo } }
      : { ok: false, error: `catchUpTo must be a whole number from 1 to ${MAX_CATCH_UP_TO}` };
  }

  if (userData) {
    if (expect === undefined) return { ok: true, request: { kind: "set", userData, expect: null } };
    return isUserAnimeData(expect)
      ? { ok: true, request: { kind: "set", userData, expect } }
      : { ok: false, error: "expect must be a complete userData object" };
  }
  if (expect !== undefined) return { ok: false, error: "expect only goes with userData" };
  return { ok: false, error: REQUIRED_ERROR };
}

/**
 * A +1 batch or a catch-up, applied to `entry.userData` (the stored value on
 * the server; the shown value in the demo). It carries no status, so the +1
 * rules apply unchanged: Plan to Watch or Paused → Watching, auto-complete at
 * the last episode, dates filled in. Never lowers progress (a legacy 30-of-24
 * entry, or one logged ahead through Edit, stays as it is), and neither logs
 * past what has aired at `now` (airedEpisodes, whatever the status; no cap
 * when that count is unknown). A catch-up also needs Watching or Paused
 * (unloggedAired is null for the others), so on those it changes nothing.
 */
export function applyProgressRequest(entry: TrackEntry, req: ProgressRequest, now: number): ApplyResult {
  const stored = entry.userData.episodeProgressNumber;
  const total = entry.episodes && entry.episodes > 0 ? entry.episodes : null;
  let target: number;
  if (req.kind === "increment") {
    const aired = airedEpisodes(entry, now);
    target = Math.min(stored + req.increment, aired ?? Number.POSITIVE_INFINITY);
  } else {
    const unlogged = unloggedAired(entry, now);
    if (!unlogged) return { ok: true, value: entry.userData, changed: false };
    target = Math.min(req.catchUpTo, stored + unlogged);
  }
  target = Math.min(target, total ?? MAX_EPISODES);
  if (target <= stored) return { ok: true, value: entry.userData, changed: false };
  const result = normalizeUserData(
    { episodeProgressNumber: target },
    { episodes: entry.episodes ?? null, previous: entry.userData, now }
  );
  return result.ok ? { ok: true, value: result.value, changed: !sameUserData(result.value, entry.userData) } : result;
}

/** Any request, applied to `entry.userData`. An Undo whose `expect` no longer matches → code "changed". */
export function applyUserDataRequest(req: UserDataRequest, entry: TrackEntry, now: number): ApplyResult {
  if (req.kind !== "set") return applyProgressRequest(entry, req, now);
  if (req.expect && !sameUserData(entry.userData, req.expect)) {
    return { ok: false, error: CHANGED_ERROR, code: "changed" };
  }
  const result = normalizeUserData(req.userData, {
    episodes: entry.episodes ?? null,
    previous: entry.userData,
    now,
  });
  return result.ok ? { ok: true, value: result.value, changed: !sameUserData(result.value, entry.userData) } : result;
}
