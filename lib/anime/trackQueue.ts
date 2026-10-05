/**
 * The +1 engine behind My List's cards and the landing's TrackerDemo (one
 * class, so the demo can't drift from the page). No React, no DOM: the
 * transport, clock and timers are injected, and results come out as events.
 *
 * Per show it keeps the server-confirmed userData, at most one request in
 * flight, and a queue of taps made meanwhile (merged into one `{increment: k}`
 * or `{catchUpTo}`), so no tap is ever dropped and a burst of taps costs one
 * request per in-flight period. What a card shows is derived: the confirmed
 * value with every unsent op applied (applyProgressRequest, the server's own
 * rules). One line is said per burst, once 700 ms pass with nothing in
 * flight. After a confirmed change the card gets an Undo that restores the
 * server's `previous`, checked against what this page last saved (`expect`),
 * so it never erases another tab's or device's change. A save whose outcome
 * can't be known (no response) is never resent: the engine re-reads the list.
 */
import { unloggedAired, type AiringFields } from "./airing";
import { burstMessage, failedMessage, undoMessage, type ConsoleMessage, type FailReason } from "./trackerConsole";
import type { UserAnimeData } from "./types";
import {
  MAX_CATCH_UP_TO,
  MAX_INCREMENT,
  applyProgressRequest,
  sameUserData,
  type ProgressRequest,
} from "./userDataRequest";

export type { FailReason };

/** A failed save. `rejected`: the server said no. `changed`: an Undo's entry changed. `unknown`: no answer. */
export class SaveError extends Error {
  readonly outcome: "rejected" | "changed" | "unknown";
  readonly reason: FailReason;
  /** The server's stored value, for `changed`. */
  readonly userData: UserAnimeData | null;
  constructor(
    message: string,
    outcome: "rejected" | "changed" | "unknown",
    reason: FailReason,
    userData: UserAnimeData | null = null
  ) {
    super(message);
    this.name = "SaveError";
    this.outcome = outcome;
    this.reason = reason;
    this.userData = userData;
  }
}

/** A saved write: the stored value now, and the one it replaced (null from a server that doesn't say). */
export interface SaveOutcome {
  userData: UserAnimeData;
  previous: UserAnimeData | null;
  /**
   * The stored airing fields the server counted from (a catch-up's response):
   * the card adopts them, so its "Log N new" agrees with what the server logs.
   */
  snapshot?: Partial<AiringFields>;
}

export type TrackMedia = Partial<AiringFields> & { id: number };

export interface TrackTransport {
  log(id: number, op: ProgressRequest, media: TrackMedia): Promise<SaveOutcome>;
  undo(id: number, restore: UserAnimeData, expect: UserAnimeData, media: TrackMedia): Promise<SaveOutcome>;
  /** The stored userData, or null when the show is no longer on the list. Throws when unreadable. */
  read(id: number): Promise<UserAnimeData | null>;
}

/** A card's Undo. A new object whenever a field changes, otherwise the same reference. */
export interface UndoView {
  /** Episodes pressing Undo reverts: shown progress minus `restore`'s (taps in flight and queued included). */
  n: number;
  restore: UserAnimeData;
  /** An undo is waiting or in flight. */
  undoing: boolean;
  /** Its timer may run: false while a burst is open or while undoing. */
  counting: boolean;
}

export interface CardActivity {
  /** A request (or a re-read) is in flight. */
  saving: boolean;
  /** Taps since the card was last reset (alternates the +1's squish). */
  taps: number;
  /** A tap or catch-up just completed the show (the bar's one sheen). */
  justCompleted: boolean;
  undo: UndoView | null;
}

export interface TrackEvents {
  /** What the card shows changed. `prev` is the view emitted before it. */
  view(id: number, userData: UserAnimeData, prev: UserAnimeData): void;
  /** Null when there's nothing to show; emitted only on change. */
  activity(id: number, activity: CardActivity | null): void;
  /** One line per burst, undo or failure (toast it, speak `spoken`). */
  say(id: number, message: ConsoleMessage, opts: { celebrate: boolean }): void;
  /** After a burst line, an undo or a failure (My List refreshes its router cache). */
  settled(id: number): void;
  /** The server's stored airing fields for the show (after a catch-up): update the card's copy. */
  media?(id: number, fields: Partial<AiringFields>): void;
}

type Timer = ReturnType<typeof setTimeout>;

interface Burst {
  /** The stored value before this burst's first confirmed change. */
  first: UserAnimeData | null;
  /** The latest confirmed value. */
  last: UserAnimeData | null;
  /** A response showed the stored value had moved on since this page's last save. */
  stale: boolean;
  catchUp: boolean;
  lastActionAt: number;
  timer: Timer | null;
}

interface Track {
  id: number;
  media: TrackMedia;
  title: string | undefined;
  confirmed: UserAnimeData;
  lastView: UserAnimeData;
  lastActivity: CardActivity | null;
  sending: { kind: "log"; op: ProgressRequest; from: UserAnimeData } | { kind: "undo"; from: UserAnimeData } | null;
  queue: ProgressRequest[];
  undoPending: boolean;
  /** The save a pending Undo waited on found another writer's change (the Undo's line says so). */
  undoStale: boolean;
  rereading: boolean;
  /** Edit is open (or was): no new Undo until the next tap, catch-up or adopt. */
  suppressUndo: boolean;
  burst: Burst | null;
  streak: { restore: UserAnimeData; expect: UserAnimeData } | null;
  taps: number;
  justCompleted: boolean;
  waiters: ((value: UserAnimeData | null) => void)[];
}

const QUIET_MS = 700;

const knownTotal = (episodes: number | null | undefined) => (episodes && episodes > 0 ? episodes : null);

/** Folds unsent ops onto a value with the server's own rules (a step that fails keeps the value). */
function applyOps(media: TrackMedia, base: UserAnimeData, ops: readonly ProgressRequest[], now: number) {
  let value = base;
  for (const op of ops) {
    const result = applyProgressRequest({ ...media, userData: value }, op, now);
    if (result.ok) value = result.value;
  }
  return value;
}

/** Merges an op into the queue: taps add up (≤ MAX_INCREMENT), catch-ups keep the larger target. */
function merge(queue: ProgressRequest[], op: ProgressRequest) {
  const last = queue[queue.length - 1];
  if (op.kind === "increment" && last?.kind === "increment" && last.increment + op.increment <= MAX_INCREMENT) {
    queue[queue.length - 1] = { kind: "increment", increment: last.increment + op.increment };
  } else if (op.kind === "catchUp" && last?.kind === "catchUp") {
    queue[queue.length - 1] = { kind: "catchUp", catchUpTo: Math.max(last.catchUpTo, op.catchUpTo) };
  } else {
    queue.push(op);
  }
}

const asSaveError = (err: unknown) =>
  err instanceof SaveError
    ? err
    : new SaveError(err instanceof Error ? err.message : String(err), "unknown", "server");

export class TrackQueue {
  private readonly tracks = new Map<number, Track>();
  private events: TrackEvents | null = null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => Timer;
  private readonly clearTimer: (timer: Timer) => void;
  private readonly quietMs: number;

  constructor(
    private readonly transport: TrackTransport,
    opts: {
      now?: () => number;
      setTimer?: (fn: () => void, ms: number) => Timer;
      clearTimer?: (timer: Timer) => void;
      quietMs?: number;
    } = {}
  ) {
    this.now = opts.now ?? (() => Date.now());
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((timer) => clearTimeout(timer));
    this.quietMs = opts.quietMs ?? QUIET_MS;
  }

  /**
   * One events sink at a time; returns the disconnect function. Events while
   * disconnected are dropped, never replayed (requests keep going, silently).
   */
  connect(events: TrackEvents): () => void {
    this.events = events;
    return () => {
      if (this.events === events) this.events = null;
    };
  }

  /** A +1. `shown` seeds a new track (what the card shows); `title` names the show in lines. */
  tap(media: TrackMedia, shown: UserAnimeData, title?: string) {
    const t = this.track(media, shown, title);
    t.suppressUndo = false;
    const before = this.view(t);
    const total = knownTotal(media.episodes);
    if (total !== null && before.episodeProgressNumber >= total) return;
    this.openBurst(t);
    merge(t.queue, { kind: "increment", increment: 1 });
    t.taps += 1;
    this.markCompletion(t, before);
    this.emit(t);
    this.pump(t);
  }

  /** "Log N new": `count` is what the chip showed, so the request never exceeds what the reader saw aired. */
  catchUp(media: TrackMedia, shown: UserAnimeData, count: number, title?: string) {
    const t = this.track(media, shown, title);
    t.suppressUndo = false;
    const before = this.view(t);
    const catchUpTo = before.episodeProgressNumber + count;
    if (count < 1 || catchUpTo > MAX_CATCH_UP_TO) return;
    this.openBurst(t);
    t.burst!.catchUp = true;
    merge(t.queue, { kind: "catchUp", catchUpTo });
    this.markCompletion(t, before);
    this.emit(t);
    this.pump(t);
  }

  undo(id: number) {
    const t = this.tracks.get(id);
    if (!t || !t.streak || this.undoActive(t)) return;
    t.queue = [];
    this.closeBurst(t);
    t.undoPending = true;
    t.undoStale = false;
    this.emit(t);
    if (!t.sending) this.sendUndo(t);
  }

  /** Undo's time ran out. */
  expireUndo(id: number) {
    const t = this.tracks.get(id);
    if (!t || this.undoActive(t)) return;
    t.streak = null;
    this.emit(t);
  }

  /** Edit opened: close the card's Undo and offer none until the next tap, catch-up or adopt. */
  closeUndo(id: number) {
    const t = this.tracks.get(id);
    if (!t) return;
    t.suppressUndo = true;
    if (!this.undoActive(t)) t.streak = null;
    this.emit(t);
  }

  /** A shelf, sort or filter change: Undos close, and idle cards drop their motion state. */
  viewChanged() {
    for (const t of this.tracks.values()) {
      if (this.undoActive(t)) continue;
      t.streak = null;
      if (!this.saving(t)) {
        t.taps = 0;
        t.justCompleted = false;
      }
      this.emit(t);
    }
  }

  /** A value saved elsewhere on the page (Edit, the demo's pills): resets the track to it. */
  adopt(id: number, userData: UserAnimeData, media?: TrackMedia) {
    const t = this.tracks.get(id) ?? this.create(media ?? { id }, userData);
    if (media) t.media = media;
    t.queue = [];
    this.closeBurst(t);
    t.streak = null;
    t.suppressUndo = false;
    t.taps = 0;
    t.justCompleted = false;
    t.confirmed = userData;
    this.emit(t, true);
  }

  /** The show was removed: drop its track; late responses are ignored. */
  forget(id: number) {
    const t = this.tracks.get(id);
    if (!t) return;
    this.closeBurst(t);
    this.tracks.delete(id);
    for (const resolve of t.waiters.splice(0)) resolve(null);
  }

  /**
   * Resolves with the confirmed value once nothing is in flight or queued (null
   * for an unknown or forgotten id). `beforeBurst`: the value before a burst
   * whose line hasn't been said yet, so the Edit dialog's line can cover it.
   */
  whenIdle(id: number, { beforeBurst = false }: { beforeBurst?: boolean } = {}): Promise<UserAnimeData | null> {
    const t = this.tracks.get(id);
    if (!t) return Promise.resolve(null);
    const value = () => (beforeBurst && t.burst?.first) || t.confirmed;
    if (this.idle(t)) return Promise.resolve(value());
    return new Promise((resolve) => t.waiters.push((confirmed) => resolve(confirmed && value())));
  }

  // ---------------------------------------------------------------- internals

  private track(media: TrackMedia, shown: UserAnimeData, title?: string) {
    const t = this.tracks.get(media.id) ?? this.create(media, shown);
    t.media = media;
    if (title !== undefined) t.title = title;
    return t;
  }

  private create(media: TrackMedia, shown: UserAnimeData): Track {
    const t: Track = {
      id: media.id,
      media,
      title: undefined,
      confirmed: shown,
      lastView: shown,
      lastActivity: null,
      sending: null,
      queue: [],
      undoPending: false,
      undoStale: false,
      rereading: false,
      suppressUndo: false,
      burst: null,
      streak: null,
      taps: 0,
      justCompleted: false,
      waiters: [],
    };
    this.tracks.set(media.id, t);
    return t;
  }

  private live(t: Track) {
    return this.tracks.get(t.id) === t;
  }

  private undoActive(t: Track) {
    return t.undoPending || t.sending?.kind === "undo";
  }

  private saving(t: Track) {
    return t.sending !== null || t.rereading;
  }

  private idle(t: Track) {
    return !t.sending && t.queue.length === 0 && !t.undoPending && !t.rereading;
  }

  /** What the card shows: the confirmed value (or Undo's target while undoing) plus every unsent op. */
  private view(t: Track) {
    const undoing = this.undoActive(t) && t.streak !== null;
    const base = undoing ? t.streak!.restore : t.confirmed;
    const ops = t.sending?.kind === "log" && !undoing ? [t.sending.op, ...t.queue] : t.queue;
    return applyOps(t.media, base, ops, this.now());
  }

  private markCompletion(t: Track, before: UserAnimeData) {
    const after = this.view(t);
    if (after.listType === "completed" && before.listType !== "completed") t.justCompleted = true;
  }

  private activity(t: Track, view: UserAnimeData): CardActivity | null {
    const previous = t.lastActivity?.undo ?? null;
    let undo: UndoView | null = null;
    if (t.streak) {
      const undoing = this.undoActive(t);
      const next = {
        n: view.episodeProgressNumber - t.streak.restore.episodeProgressNumber,
        restore: t.streak.restore,
        undoing,
        counting: !t.burst && !undoing,
      };
      undo =
        previous &&
        previous.n === next.n &&
        previous.restore === next.restore &&
        previous.undoing === next.undoing &&
        previous.counting === next.counting
          ? previous
          : next;
    }
    const saving = this.saving(t);
    if (!saving && t.taps === 0 && !t.justCompleted && !undo) return null;
    return { saving, taps: t.taps, justCompleted: t.justCompleted, undo };
  }

  private emit(t: Track, forceView = false) {
    if (!this.live(t)) return;
    const view = this.view(t);
    if (view.listType !== "completed") t.justCompleted = false;
    if (forceView || !sameUserData(view, t.lastView)) {
      const prev = t.lastView;
      t.lastView = view;
      this.events?.view(t.id, view, prev);
    }
    const activity = this.activity(t, view);
    const last = t.lastActivity;
    const same =
      activity === last ||
      (activity !== null &&
        last !== null &&
        activity.saving === last.saving &&
        activity.taps === last.taps &&
        activity.justCompleted === last.justCompleted &&
        activity.undo === last.undo);
    if (!same) {
      t.lastActivity = activity;
      this.events?.activity(t.id, activity);
    }
    if (this.idle(t) && t.waiters.length) {
      for (const resolve of t.waiters.splice(0)) resolve(t.confirmed);
    }
  }

  private say(t: Track, message: ConsoleMessage, celebrate = false) {
    this.events?.say(t.id, message, { celebrate });
    this.events?.settled(t.id);
  }

  private openBurst(t: Track) {
    if (t.burst?.timer) this.clearTimer(t.burst.timer);
    if (t.burst) {
      t.burst.timer = null;
      t.burst.lastActionAt = this.now();
    } else {
      t.burst = { first: null, last: null, stale: false, catchUp: false, lastActionAt: this.now(), timer: null };
    }
  }

  private closeBurst(t: Track) {
    if (t.burst?.timer) this.clearTimer(t.burst.timer);
    t.burst = null;
  }

  private pump(t: Track) {
    if (!this.live(t) || t.sending || t.rereading) return;
    if (t.undoPending) {
      this.sendUndo(t);
      return;
    }
    const op = t.queue.shift();
    if (op) {
      const sending = { kind: "log" as const, op, from: t.confirmed };
      t.sending = sending;
      this.emit(t);
      Promise.resolve()
        .then(() => this.transport.log(t.id, op, t.media))
        .then(
          (outcome) => this.logSaved(t, sending, outcome),
          (err) => this.logFailed(t, err)
        );
      return;
    }
    if (t.burst) this.scheduleSettle(t);
  }

  private logSaved(t: Track, sending: { from: UserAnimeData }, { userData, previous, snapshot }: SaveOutcome) {
    if (!this.live(t)) return;
    if (snapshot) {
      t.media = { ...t.media, ...snapshot };
      this.events?.media?.(t.id, snapshot);
    }
    const burst = t.burst;
    if (previous === null) {
      // A server that doesn't report `previous` (deploy skew): no Undo without it.
      if (burst) {
        burst.first ??= sending.from;
        burst.last = userData;
      }
      t.streak = null;
    } else {
      const chainOk = sameUserData(previous, sending.from);
      const changed = !sameUserData(previous, userData);
      if (burst) {
        if (chainOk) burst.first ??= previous;
        else {
          // Another writer moved it: the range restarts at the value they left.
          burst.first = previous;
          burst.stale = true;
        }
        burst.last = userData;
      }
      // Undo must never erase another writer's change.
      if (!chainOk) {
        t.streak = null;
        if (t.undoPending) t.undoStale = true;
      }
      if (changed && !t.suppressUndo) {
        t.streak ??= { restore: previous, expect: userData };
        t.streak.expect = userData;
      }
    }
    t.confirmed = userData;
    t.sending = null;
    this.emit(t);
    this.pump(t);
  }

  private logFailed(t: Track, err: unknown) {
    if (!this.live(t)) return;
    const error = asSaveError(err);
    const { episodes } = t.media;
    // Taps queued behind it were counted from a value that never saved.
    t.sending = null;
    t.queue = [];
    this.closeBurst(t);
    if (error.outcome === "unknown") {
      const undoDropped = t.undoPending;
      t.streak = null;
      t.undoPending = false;
      this.reread(t, "save", undoDropped);
      return;
    }
    if (error.outcome === "changed") {
      t.confirmed = error.userData ?? t.confirmed;
      t.streak = null;
      t.undoPending = false;
    } else if (error.reason === "notOnList") {
      t.streak = null;
      t.undoPending = false;
    }
    // Signed out: a waiting Undo would only get a second 401. It stays on the card for a retry.
    const undoDropped = error.outcome === "rejected" && error.reason === "signedOut" && t.undoPending;
    if (undoDropped) t.undoPending = false;
    const reason = error.outcome === "changed" ? "changed" : error.reason;
    this.say(
      t,
      failedMessage({
        action: "save",
        outcome: "rejected",
        reason,
        undoDropped,
        current: reason === "notOnList" ? null : t.confirmed,
        episodes: episodes ?? null,
        title: t.title,
      })
    );
    this.emit(t);
    this.pump(t);
  }

  /** After a request with no answer: read the stored value once, never resend. */
  private reread(t: Track, action: "save" | "undo", undoDropped: boolean) {
    t.rereading = true;
    this.emit(t);
    const episodes = t.media.episodes ?? null;
    Promise.resolve()
      .then(() => this.transport.read(t.id))
      .then(
        (stored) => {
          if (!this.live(t)) return;
          t.rereading = false;
          if (stored) {
            t.confirmed = stored;
            this.say(t, failedMessage({ action, outcome: "checked", undoDropped, current: stored, episodes, title: t.title }));
          } else {
            this.say(t, failedMessage({ action, outcome: "rejected", reason: "notOnList", current: null, episodes, title: t.title }));
          }
          this.emit(t);
          this.pump(t);
        },
        () => {
          if (!this.live(t)) return;
          t.rereading = false;
          this.say(
            t,
            failedMessage({ action, outcome: "unchecked", undoDropped, current: t.confirmed, episodes, title: t.title })
          );
          this.emit(t);
          this.pump(t);
        }
      );
  }

  private scheduleSettle(t: Track) {
    const burst = t.burst;
    if (!burst) return;
    const total = knownTotal(t.media.episodes);
    const elapsed = this.now() - burst.lastActionAt;
    if ((total !== null && t.confirmed.episodeProgressNumber >= total) || elapsed >= this.quietMs) {
      this.settle(t);
      return;
    }
    if (burst.timer) this.clearTimer(burst.timer);
    burst.timer = this.setTimer(() => {
      burst.timer = null;
      if (this.live(t) && t.burst === burst && this.idle(t)) this.settle(t);
    }, this.quietMs - elapsed);
  }

  private settle(t: Track) {
    const burst = t.burst!;
    this.closeBurst(t);
    if (burst.first && burst.last) {
      const { first, last } = burst;
      const now = this.now();
      this.say(
        t,
        burstMessage({
          first,
          last,
          stale: burst.stale,
          catchUp: burst.catchUp,
          episodes: t.media.episodes ?? null,
          title: t.title,
          unlogged: {
            before: unloggedAired({ ...t.media, userData: first }, now),
            after: unloggedAired({ ...t.media, userData: last }, now),
          },
        }),
        last.listType === "completed" && first.listType !== "completed"
      );
    }
    this.emit(t);
  }

  private sendUndo(t: Track) {
    t.undoPending = false;
    const episodes = t.media.episodes ?? null;
    if (!t.streak) {
      t.undoStale = false;
      // The save it waited on showed another writer's change and changed nothing itself.
      this.say(
        t,
        failedMessage({ action: "undo", outcome: "rejected", reason: "changed", current: t.confirmed, episodes, title: t.title })
      );
      this.emit(t);
      this.pump(t);
      return;
    }
    const { restore, expect } = t.streak;
    t.sending = { kind: "undo", from: t.confirmed };
    this.emit(t);
    Promise.resolve()
      .then(() => this.transport.undo(t.id, restore, expect, t.media))
      .then(
        ({ userData, previous }) => {
          if (!this.live(t)) return;
          t.confirmed = userData;
          t.streak = null;
          t.sending = null;
          const stale = t.undoStale;
          t.undoStale = false;
          this.say(t, undoMessage({ from: previous ?? expect, restored: userData, episodes, title: t.title, stale }));
          this.emit(t);
          this.pump(t);
        },
        (err) => {
          if (!this.live(t)) return;
          const error = asSaveError(err);
          t.sending = null;
          t.undoStale = false;
          if (error.outcome === "unknown") {
            // Taps made while "Undoing…" were counted from a value that may never have saved.
            t.queue = [];
            this.closeBurst(t);
            t.streak = null;
            this.reread(t, "undo", false);
            return;
          }
          if (error.outcome === "changed") {
            t.confirmed = error.userData ?? t.confirmed;
            t.streak = null;
          } else if (error.reason !== "signedOut") {
            // Not on the list, or refused: a retry would fail the same way. Signed out keeps
            // its Undo, so signing in again in another tab makes a retry work.
            t.streak = null;
          }
          const reason = error.outcome === "changed" ? "changed" : error.reason;
          this.say(
            t,
            failedMessage({
              action: "undo",
              outcome: "rejected",
              reason,
              current: reason === "notOnList" ? null : t.confirmed,
              episodes,
              title: t.title,
            })
          );
          this.emit(t);
          this.pump(t);
        }
      );
  }
}
