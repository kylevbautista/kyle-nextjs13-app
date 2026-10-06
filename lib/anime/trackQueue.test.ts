import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserAnimeData } from "./types";
import type { ProgressRequest } from "./userDataRequest";
import { SaveError, TrackQueue, type CardActivity, type SaveOutcome, type TrackMedia } from "./trackQueue";
import type { ConsoleMessage } from "./trackerConsole";

const NOW = Date.UTC(2026, 9, 4, 18);
const day = Date.UTC(2026, 6, 4);

const ud = (episodeProgressNumber: number, overrides: Partial<UserAnimeData> = {}): UserAnimeData => ({
  listType: "watching",
  episodeProgressNumber,
  startDate: day,
  finishDate: null,
  score: null,
  ...overrides,
});

/** A weekly 24-episode show whose EP 20 airs in an hour (19 aired). */
const media: TrackMedia = {
  id: 7,
  status: "RELEASING",
  episodes: 24,
  upcomingEpisode: { id: 1, episode: 20, timeUntilAiring: null, mediaId: 7 },
  upComingAirDate: { episode: [{ airingAt: Math.floor(NOW / 1000) + 3600, episode: 20, timeUntilAiring: null }] },
};

/** The same show once it has finished: all 24 episodes aired, so only the total bounds a +1. */
const finished: TrackMedia = { id: 7, status: "FINISHED", episodes: 24, upcomingEpisode: null, upComingAirDate: { episode: [] } };

interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

/** A transport whose every call waits until the test settles it. */
function rig() {
  const logs: { op: ProgressRequest; d: Deferred<SaveOutcome> }[] = [];
  const undos: { restore: UserAnimeData; expect: UserAnimeData; d: Deferred<SaveOutcome> }[] = [];
  const reads: Deferred<UserAnimeData | null>[] = [];
  const transport = {
    log: vi.fn(
      (_id: number, op: ProgressRequest) =>
        new Promise<SaveOutcome>((resolve, reject) => logs.push({ op, d: { resolve, reject } }))
    ),
    undo: vi.fn(
      (_id: number, restore: UserAnimeData, expect: UserAnimeData) =>
        new Promise<SaveOutcome>((resolve, reject) => undos.push({ restore, expect, d: { resolve, reject } }))
    ),
    read: vi.fn(() => new Promise<UserAnimeData | null>((resolve, reject) => reads.push({ resolve, reject }))),
  };
  const queue = new TrackQueue(transport, { now: () => Date.now() });
  const views: UserAnimeData[] = [];
  const activities: (CardActivity | null)[] = [];
  const said: ConsoleMessage[] = [];
  const settled = vi.fn();
  const disconnect = queue.connect({
    view: (_id, value) => views.push(value),
    activity: (_id, value) => activities.push(value),
    say: (_id, message) => said.push(message),
    settled,
  });
  const lastView = () => views[views.length - 1];
  const lastActivity = () => activities[activities.length - 1] ?? null;
  return { queue, transport, logs, undos, reads, views, activities, said, settled, disconnect, lastView, lastActivity };
}

/** Lets promise callbacks run (fake timers don't advance microtasks by themselves). */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("batching", () => {
  it("sends one request per in-flight period and says one line", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    r.queue.tap(media, ud(13), "Knight");
    r.queue.tap(media, ud(13), "Knight");
    expect(r.lastView().episodeProgressNumber).toBe(16);
    await flush();
    expect(r.logs.map((l) => l.op)).toEqual([{ kind: "increment", increment: 1 }]);
    expect(r.lastActivity()?.saving).toBe(true);
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    expect(r.logs.map((l) => l.op)).toEqual([
      { kind: "increment", increment: 1 },
      { kind: "increment", increment: 2 },
    ]);
    // Undo counts every episode on screen, the queued ones included.
    expect(r.lastActivity()?.undo).toMatchObject({ n: 3, counting: false, undoing: false });
    r.logs[1].d.resolve({ userData: ud(16), previous: ud(14) });
    await flush();
    expect(r.said).toEqual([]);
    vi.advanceTimersByTime(699);
    expect(r.said).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(r.said.map((m) => m.spoken)).toEqual(["Episodes 14 to 16 logged for Knight. 8 to go."]);
    expect(r.said[0].text).toBe("Episodes 14–16 logged for Knight. 8 to go.");
    expect(r.settled).toHaveBeenCalledTimes(1);
    expect(r.lastActivity()?.undo).toMatchObject({ n: 3, counting: true, restore: ud(13) });
  });

  it("keeps one line when a tap lands after a fast response", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    vi.advanceTimersByTime(400);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.logs[1].d.resolve({ userData: ud(15), previous: ud(14) });
    await flush();
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual(["Episodes 14–15 logged for Knight. 9 to go."]);
  });

  it("settles at once at the finale", async () => {
    const r = rig();
    r.queue.tap(finished, ud(23), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(24, { listType: "completed", finishDate: day }), previous: ud(23) });
    await flush();
    expect(r.said.map((m) => m.text)).toEqual(["Final episode reached. Knight moved to Completed. Finish date set to today."]);
    // No more taps past the total.
    r.queue.tap(finished, ud(24), "Knight");
    await flush();
    expect(r.transport.log).toHaveBeenCalledTimes(1);
  });

  it("splits more than 100 queued taps", async () => {
    const r = rig();
    // A long runner whose next episode is TBA: nothing caps it.
    const long: TrackMedia = { id: 7, status: "RELEASING", episodes: null, upcomingEpisode: null, upComingAirDate: { episode: [] } };
    for (let i = 0; i < 102; i++) r.queue.tap(long, ud(0), "Long");
    await flush();
    r.logs[0].d.resolve({ userData: ud(1), previous: ud(0) });
    await flush();
    r.logs[1].d.resolve({ userData: ud(101), previous: ud(1) });
    await flush();
    expect(r.logs.map((l) => l.op)).toEqual([
      { kind: "increment", increment: 1 },
      { kind: "increment", increment: 100 },
      { kind: "increment", increment: 1 },
    ]);
  });
});

describe("failures", () => {
  it("rolls back a rejected save, drops the queue and keeps an earlier Undo", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    vi.advanceTimersByTime(700);
    r.queue.tap(media, ud(14), "Knight");
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.logs[1].d.reject(new SaveError("x", "rejected", "signedOut"));
    await flush();
    expect(r.lastView().episodeProgressNumber).toBe(14);
    expect(r.transport.log).toHaveBeenCalledTimes(2);
    expect(r.said.map((m) => m.text)).toEqual([
      "Episode 14 logged for Knight. 10 to go.",
      "Couldn't save: you're signed out. Knight is at Ep 14 / 24.",
    ]);
    expect(r.said[1].kind).toBe("Warning");
    expect(r.lastActivity()?.undo).toMatchObject({ n: 1, restore: ud(13) });
  });

  it("ends the Undo when the show is gone", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    vi.advanceTimersByTime(700);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.logs[1].d.reject(new SaveError("x", "rejected", "notOnList"));
    await flush();
    expect(r.lastActivity()?.undo ?? null).toBeNull();
    expect(r.said.at(-1)?.text).toBe("Couldn't save: Knight isn't on your list anymore. Reload to update it.");
  });

  it("re-reads once after an unknown outcome and never resends", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.reject(new SaveError("x", "unknown", "offline"));
    await flush();
    expect(r.transport.read).toHaveBeenCalledTimes(1);
    expect(r.lastActivity()?.saving).toBe(true);
    r.reads[0].resolve(ud(14));
    await flush();
    expect(r.transport.log).toHaveBeenCalledTimes(1);
    expect(r.lastView().episodeProgressNumber).toBe(14);
    expect(r.said.map((m) => m.text)).toEqual(["Couldn't confirm the save. Checked again: Knight is at Ep 14 / 24."]);
    expect(r.lastActivity()?.undo ?? null).toBeNull();
  });

  it("treats a busy 409 and a plain Error as unknown", async () => {
    for (const err of [new SaveError("busy", "unknown", "busy"), new Error("boom")]) {
      const r = rig();
      r.queue.tap(media, ud(13), "Knight");
      await flush();
      r.logs[0].d.reject(err);
      await flush();
      expect(r.transport.read).toHaveBeenCalledTimes(1);
      r.reads[0].resolve(ud(13));
      await flush();
      expect(r.transport.log).toHaveBeenCalledTimes(1);
    }
  });

  it("says unchecked when the re-read fails too", async () => {
    const r = rig();
    r.queue.tap(media, ud(5), "Knight");
    await flush();
    r.logs[0].d.reject(new SaveError("x", "unknown", "offline"));
    await flush();
    r.reads[0].reject(new Error("offline"));
    await flush();
    expect(r.said.map((m) => m.text)).toEqual([
      "Couldn't confirm the save. Knight was last confirmed at Ep 5 / 24. Reload to check.",
    ]);
    expect(r.lastView().episodeProgressNumber).toBe(5);
  });

  it("drops a waiting Undo after an unknown outcome, and says so", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.queue.undo(media.id);
    expect(r.lastView().episodeProgressNumber).toBe(13);
    r.logs[1].d.reject(new SaveError("x", "unknown", "offline"));
    await flush();
    r.reads[0].resolve(ud(15));
    await flush();
    expect(r.transport.undo).not.toHaveBeenCalled();
    expect(r.said.at(-1)?.text).toBe(
      "Couldn't confirm the save, so Undo wasn't sent. Checked again: Knight is at Ep 15 / 24."
    );
  });
});

describe("stale pages", () => {
  it("restarts the range at the value another writer left", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    // The server held 15 (another tab), so this +1 made 16.
    r.logs[0].d.resolve({ userData: ud(16), previous: ud(15) });
    await flush();
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual([
      "Episode 16 logged for Knight. It had changed since this page last checked: now Ep 16 / 24.",
    ]);
    expect(r.lastActivity()?.undo).toMatchObject({ n: 1, restore: ud(15) });
  });
});

describe("catch-up", () => {
  it("asks for what the chip showed, and keeps later taps separate", async () => {
    const r = rig();
    r.queue.catchUp(media, ud(12), 3, "Knight");
    expect(r.lastView().episodeProgressNumber).toBe(15);
    r.queue.tap(media, ud(12), "Knight");
    r.queue.catchUp(media, ud(12), 1, "Knight");
    r.queue.catchUp(media, ud(12), 1, "Knight");
    await flush();
    expect(r.logs[0].op).toEqual({ kind: "catchUp", catchUpTo: 15 });
    r.logs[0].d.resolve({ userData: ud(15), previous: ud(12) });
    await flush();
    expect(r.logs[1].op).toEqual({ kind: "increment", increment: 1 });
    r.logs[1].d.resolve({ userData: ud(16), previous: ud(15) });
    await flush();
    // Two catch-ups queued back to back merge into one op with the larger target (view + 1 each: 17, then 18).
    expect(r.logs[2].op).toEqual({ kind: "catchUp", catchUpTo: 18 });
    expect(r.logs).toHaveLength(3);
  });

  it("says the server didn't count it as aired when it logs nothing the page counts", async () => {
    const r = rig();
    r.queue.catchUp(media, ud(18), 1, "Knight");
    await flush();
    // The page counts 19 aired; the server (its clock behind) logged nothing.
    r.logs[0].d.resolve({ userData: ud(18), previous: ud(18) });
    await flush();
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual([
      "Nothing logged: the server doesn't count a new episode as aired yet. Knight is at Ep 18 / 24.",
    ]);
    expect(r.lastActivity()?.undo ?? null).toBeNull();
  });
});

describe("undo", () => {
  async function afterBurst(r: ReturnType<typeof rig>) {
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
  }

  it("waits for the in-flight save and expects its result", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.queue.tap(media, ud(15), "Knight");
    r.queue.undo(media.id);
    expect(r.lastView().episodeProgressNumber).toBe(13);
    expect(r.lastActivity()?.undo).toMatchObject({ undoing: true });
    expect(r.transport.undo).not.toHaveBeenCalled();
    r.logs[1].d.resolve({ userData: ud(15), previous: ud(14) });
    await flush();
    expect(r.undos).toHaveLength(1);
    expect(r.undos[0].restore).toEqual(ud(13));
    expect(r.undos[0].expect).toEqual(ud(15));
    // The tap queued before Undo was dropped.
    expect(r.transport.log).toHaveBeenCalledTimes(2);
    r.undos[0].d.resolve({ userData: ud(13), previous: ud(15) });
    await flush();
    expect(r.lastView()).toEqual(ud(13));
    expect(r.lastActivity()?.undo ?? null).toBeNull();
    expect(r.said.at(-1)?.text).toBe("Undone. Knight is back to Ep 13 / 24.");
  });

  it("restores a status after an auto-complete", async () => {
    const r = rig();
    r.queue.tap(finished, ud(23), "Knight");
    await flush();
    const done = ud(24, { listType: "completed", finishDate: day });
    r.logs[0].d.resolve({ userData: done, previous: ud(23) });
    await flush();
    expect(r.lastActivity()?.justCompleted).toBe(true);
    r.queue.undo(media.id);
    await flush();
    r.undos[0].d.resolve({ userData: ud(23), previous: done });
    await flush();
    expect(r.lastActivity()?.justCompleted ?? false).toBe(false);
    expect(r.said.at(-1)?.text).toBe("Undone. Knight is back in Watching at Ep 23 / 24. Finish date cleared.");
  });

  it("adopts the server's value when the show changed elsewhere", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.undo(media.id);
    await flush();
    r.undos[0].d.reject(new SaveError("x", "changed", "changed", ud(14, { score: 9 })));
    await flush();
    expect(r.lastView()).toEqual(ud(14, { score: 9 }));
    expect(r.lastActivity()?.undo ?? null).toBeNull();
    expect(r.said.at(-1)?.text).toBe("Couldn't undo: it had changed since this page last checked. Knight is at Ep 14 / 24.");
  });

  it("re-arms only when signed out", async () => {
    const signedOut = rig();
    await afterBurst(signedOut);
    signedOut.queue.undo(media.id);
    await flush();
    signedOut.undos[0].d.reject(new SaveError("x", "rejected", "signedOut"));
    await flush();
    expect(signedOut.lastActivity()?.undo).toMatchObject({ undoing: false, counting: true, n: 1 });
    for (const reason of ["notOnList", "invalid"] as const) {
      const r = rig();
      await afterBurst(r);
      r.queue.undo(media.id);
      await flush();
      r.undos[0].d.reject(new SaveError("x", "rejected", reason));
      await flush();
      expect(r.lastActivity()?.undo ?? null).toBeNull();
      r.queue.undo(media.id);
      await flush();
      expect(r.transport.undo).toHaveBeenCalledTimes(1);
    }
  });

  it("isn't cancelled by a view change, Edit or the timer once pressed", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.queue.undo(media.id);
    r.queue.viewChanged();
    r.queue.closeUndo(media.id);
    r.queue.expireUndo(media.id);
    r.logs[1].d.resolve({ userData: ud(15), previous: ud(14) });
    await flush();
    expect(r.undos).toHaveLength(1);
    r.undos[0].d.resolve({ userData: ud(13), previous: ud(15) });
    await flush();
    expect(r.said.at(-1)?.text).toBe("Undone. Knight is back to Ep 13 / 24.");
  });

  it("starts a new streak after an expired one", async () => {
    const r = rig();
    await afterBurst(r);
    vi.advanceTimersByTime(700);
    r.queue.expireUndo(media.id);
    expect(r.lastActivity()?.undo ?? null).toBeNull();
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.logs[1].d.resolve({ userData: ud(15), previous: ud(14) });
    await flush();
    expect(r.lastActivity()?.undo).toMatchObject({ n: 1, restore: ud(14) });
  });

  it("offers no Undo while Edit is open", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.queue.closeUndo(media.id);
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    expect(r.lastActivity()?.undo ?? null).toBeNull();
  });
});

describe("activity and lifecycle", () => {
  it("drops idle motion state on a view change", async () => {
    const r = rig();
    r.queue.tap(finished, ud(23), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(24, { listType: "completed", finishDate: day }), previous: ud(23) });
    await flush();
    expect(r.lastActivity()).toMatchObject({ taps: 1, justCompleted: true });
    r.queue.viewChanged();
    expect(r.lastActivity()).toBeNull();

    const busy = rig();
    busy.queue.tap(media, ud(5), "Knight");
    await flush();
    busy.queue.viewChanged();
    expect(busy.lastActivity()).toMatchObject({ saving: true, taps: 1 });
  });

  it("adopts a value saved elsewhere and cancels a pending line", async () => {
    const r = rig();
    r.queue.adopt(99, ud(3), { ...media, id: 99 });
    expect(r.lastView()).toEqual(ud(3));
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    r.queue.adopt(media.id, ud(17));
    vi.advanceTimersByTime(1000);
    expect(r.said).toEqual([]);
    r.queue.tap(media, ud(17), "Knight");
    expect(r.lastView().episodeProgressNumber).toBe(18);
  });

  it("ignores late responses after forget, and resolves its waiters with null", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    const waiting = r.queue.whenIdle(media.id);
    const count = r.views.length;
    r.queue.forget(media.id);
    await expect(waiting).resolves.toBeNull();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    vi.advanceTimersByTime(1000);
    expect(r.views.length).toBe(count);
    expect(r.said).toEqual([]);
  });

  it("resolves whenIdle with the confirmed value", async () => {
    const r = rig();
    await expect(r.queue.whenIdle(123)).resolves.toBeNull();
    r.queue.tap(media, ud(13), "Knight");
    r.queue.tap(media, ud(13), "Knight");
    const waiting = r.queue.whenIdle(media.id);
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    r.logs[1].d.resolve({ userData: ud(15), previous: ud(14) });
    await expect(waiting).resolves.toEqual(ud(15));
    await expect(r.queue.whenIdle(media.id)).resolves.toEqual(ud(15));
  });

  it("goes silent after disconnect but still sends what was queued", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    const counts = [r.views.length, r.activities.length];
    r.disconnect();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    expect(r.logs).toHaveLength(2);
    r.logs[1].d.resolve({ userData: ud(15), previous: ud(14) });
    await flush();
    vi.advanceTimersByTime(1000);
    expect([r.views.length, r.activities.length]).toEqual(counts);
    expect(r.said).toEqual([]);
    expect(r.settled).not.toHaveBeenCalled();
  });

  it("gives no Undo for a no-op save", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(13), previous: ud(13) });
    await flush();
    vi.advanceTimersByTime(700);
    expect(r.lastActivity()?.undo ?? null).toBeNull();
    // Below the last episode, only the server's aired count stops a +1 (its clock, its schedule).
    expect(r.said.map((m) => m.text)).toEqual([
      "Nothing logged: the server doesn't count a new episode as aired yet. Knight is at Ep 13 / 24.",
    ]);
  });
});

describe("review fixes", () => {
  async function afterBurst(r: ReturnType<typeof rig>) {
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    vi.advanceTimersByTime(700);
  }

  it("says when an Undo went back to another writer's value", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.queue.undo(media.id);
    // The held save shows another device had moved it to 20, so this +1 made 21.
    r.logs[1].d.resolve({ userData: ud(21), previous: ud(20) });
    await flush();
    expect(r.undos[0].restore).toEqual(ud(20));
    expect(r.undos[0].expect).toEqual(ud(21));
    r.undos[0].d.resolve({ userData: ud(20), previous: ud(21) });
    await flush();
    expect(r.said.at(-1)?.text).toBe("Undone, but it had changed since this page last checked: Knight is back to Ep 20 / 24.");
  });

  it("doesn't undo when the stale save changed nothing", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.queue.undo(media.id);
    r.logs[1].d.resolve({ userData: ud(24, { listType: "completed" }), previous: ud(24, { listType: "completed" }) });
    await flush();
    expect(r.transport.undo).not.toHaveBeenCalled();
    expect(r.said.at(-1)?.text).toBe("Couldn't undo: it had changed since this page last checked. Knight is at Ep 24 / 24.");
  });

  it("drops taps made while undoing when the undo gets no answer", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.undo(media.id);
    await flush();
    r.queue.tap(media, ud(13), "Knight");
    expect(r.lastView().episodeProgressNumber).toBe(14);
    r.undos[0].d.reject(new SaveError("x", "unknown", "offline"));
    await flush();
    expect(r.lastView().episodeProgressNumber).toBe(14); // the last confirmed value, not 14 + the queued tap
    r.reads[0].resolve(ud(13));
    await flush();
    expect(r.lastView().episodeProgressNumber).toBe(13);
    expect(r.transport.log).toHaveBeenCalledTimes(1);
    expect(r.said.at(-1)?.text).toBe("Couldn't confirm the undo. Checked again: Knight is at Ep 13 / 24.");
  });

  it("doesn't send a waiting Undo after a 401, and says so", async () => {
    const r = rig();
    await afterBurst(r);
    r.queue.tap(media, ud(14), "Knight");
    await flush();
    r.queue.undo(media.id);
    r.logs[1].d.reject(new SaveError("x", "rejected", "signedOut"));
    await flush();
    expect(r.transport.undo).not.toHaveBeenCalled();
    expect(r.said.at(-1)?.text).toBe("Couldn't save: you're signed out, so Undo wasn't sent. Knight is at Ep 14 / 24.");
    expect(r.lastActivity()?.undo).toMatchObject({ undoing: false, n: 1 });
  });

  it("adopts the server's airing fields from a catch-up", async () => {
    const r = rig();
    const fields: { id: number; fields: unknown }[] = [];
    r.disconnect();
    r.queue.connect({
      view: (_id, value) => r.views.push(value),
      activity: (_id, value) => r.activities.push(value),
      say: (_id, message) => r.said.push(message),
      settled: () => {},
      media: (id, value) => fields.push({ id, fields: value }),
    });
    r.queue.catchUp(media, ud(16), 3, "Knight");
    await flush();
    const snapshot = { upComingAirDate: { episode: [{ airingAt: Math.floor(NOW / 1000) + 3600, episode: 18, timeUntilAiring: null }] } };
    r.logs[0].d.resolve({ userData: ud(17), previous: ud(16), snapshot });
    await flush();
    expect(fields).toEqual([{ id: media.id, fields: snapshot }]);
    expect(r.lastView().episodeProgressNumber).toBe(17);
  });

  it("gives the Edit dialog the value before a burst still settling", async () => {
    const r = rig();
    r.queue.tap(media, ud(13), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(14), previous: ud(13) });
    await flush();
    await expect(r.queue.whenIdle(media.id, { beforeBurst: true })).resolves.toEqual(ud(13));
    await expect(r.queue.whenIdle(media.id)).resolves.toEqual(ud(14));
  });
});

describe("the aired cap", () => {
  const AIRS = Math.floor(NOW / 1000) + 3600; // media's EP 20
  /** The same show once EP 20's air time has passed but the page's schedule wasn't refreshed. */
  const behind: TrackMedia = {
    ...media,
    upComingAirDate: { episode: [{ airingAt: Math.floor(NOW / 1000) - 3600, episode: 20, timeUntilAiring: null }] },
  };
  const nextWeek = { upComingAirDate: { episode: [{ airingAt: Math.floor(NOW / 1000) + 7 * 86_400, episode: 21, timeUntilAiring: null }] } };

  it("refuses a tap that can't log an aired episode, and changes nothing", async () => {
    const r = rig();
    expect(r.queue.tap(media, ud(19), "Knight")).toBe(false);
    await flush();
    expect(r.transport.log).not.toHaveBeenCalled();
    expect(r.views).toEqual([]);
    expect(r.activities).toEqual([]);
    expect(r.said.map((m) => m.text)).toEqual([
      "Nothing logged: caught up on Knight. Episode 20 airs Oct 4, 2026, 12:00 PM PDT. Watched it early? Use Edit.",
    ]);
    // Nothing changed: no refresh.
    expect(r.settled).not.toHaveBeenCalled();
    expect(rig().queue.tap(media, ud(18), "Knight")).toBe(true);
  });

  it("says it once per pause in pressing", async () => {
    const r = rig();
    r.queue.tap(media, ud(19), "Knight");
    vi.advanceTimersByTime(300);
    r.queue.tap(media, ud(19), "Knight");
    vi.advanceTimersByTime(600);
    r.queue.tap(media, ud(19), "Knight");
    expect(r.said).toHaveLength(1);
    vi.advanceTimersByTime(700);
    r.queue.tap(media, ud(19), "Knight");
    expect(r.said).toHaveLength(2);
  });

  it("stays silent mid-burst, keeps the burst open, and its line says caught up", async () => {
    const r = rig();
    expect(r.queue.tap(media, ud(18), "Knight")).toBe(true);
    expect(r.queue.tap(media, ud(18), "Knight")).toBe(false);
    expect(r.lastView().episodeProgressNumber).toBe(19);
    expect(r.lastActivity()?.taps).toBe(1);
    await flush();
    r.logs[0].d.resolve({ userData: ud(19), previous: ud(18) });
    await flush();
    vi.advanceTimersByTime(400);
    r.queue.tap(media, ud(19), "Knight");
    vi.advanceTimersByTime(699);
    expect(r.said).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(r.said.map((m) => m.text)).toEqual(["Episode 19 logged for Knight. Caught up."]);
    expect(r.logs).toHaveLength(1);
    expect(r.lastActivity()?.undo).toMatchObject({ n: 1 });
  });

  it("starts a Plan to Watch show, and says caught up there too", async () => {
    const r = rig();
    const planned = ud(18, { listType: "planning" });
    r.queue.tap(media, planned, "Knight");
    r.queue.tap(media, planned, "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(19), previous: planned });
    await flush();
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual(["Episode 19 logged. Knight moved to Watching. Caught up."]);
  });

  it("takes a tap the second the next episode airs", () => {
    const r = rig();
    vi.setSystemTime(AIRS * 1000 - 1000);
    expect(r.queue.tap(media, ud(19), "Knight")).toBe(false);
    vi.setSystemTime(AIRS * 1000);
    expect(r.queue.tap(media, ud(19), "Knight")).toBe(true);
    expect(r.lastView().episodeProgressNumber).toBe(20);
  });

  it("says when a show premieres, or that it's logged ahead", () => {
    const premiere: TrackMedia = {
      ...media,
      status: "NOT_YET_RELEASED",
      upComingAirDate: { episode: [{ airingAt: AIRS, episode: 1, timeUntilAiring: null }] },
    };
    const r = rig();
    expect(r.queue.tap(premiere, ud(0, { listType: "planning", startDate: null }), "Knight")).toBe(false);
    expect(r.said.at(-1)?.text).toBe("Nothing logged: Knight premieres Oct 4, 2026, 12:00 PM PDT.");
    const ahead = rig();
    expect(ahead.queue.tap(media, ud(21), "Knight")).toBe(false);
    expect(ahead.said.at(-1)?.text).toBe("Nothing logged: episode 22 of Knight hasn't aired yet. Watched it early? Use Edit.");
  });

  it("refuses at the last episode silently", () => {
    const r = rig();
    expect(r.queue.tap(finished, ud(24, { listType: "completed" }), "Knight")).toBe(false);
    expect(r.said).toEqual([]);
  });

  it("doesn't reopen Undo or start a burst on a refusal", async () => {
    const r = rig();
    r.queue.tap(media, ud(17), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(18), previous: ud(17) });
    await flush();
    vi.advanceTimersByTime(700);
    r.queue.closeUndo(media.id);
    expect(r.lastActivity()?.undo ?? null).toBeNull();
    r.queue.adopt(media.id, ud(19));
    r.queue.closeUndo(media.id);
    expect(r.queue.tap(media, ud(19), "Knight")).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(r.said.at(-1)?.text).toMatch(/^Nothing logged: caught up on Knight\./);
    expect(r.transport.log).toHaveBeenCalledTimes(1);
  });

  it("past the schedule's horizon, lets the server decide and adopts its schedule", async () => {
    const fields: unknown[] = [];
    const r = rig();
    r.queue.connect({
      view: (_id, value) => r.views.push(value),
      activity: (_id, value) => r.activities.push(value),
      say: (_id, message) => r.said.push(message),
      settled: r.settled,
      media: (_id, f) => fields.push(f),
    });
    // EP 20's air time has passed: 20 aired at least, maybe more since.
    expect(r.queue.tap(behind, ud(20), "Knight")).toBe(true);
    // No step past what the page knows has aired (no new view), but the tap is on its way.
    expect(r.views).toEqual([]);
    expect(r.lastActivity()).toMatchObject({ saving: true, taps: 1 });
    await flush();
    expect(r.logs.map((l) => l.op)).toEqual([{ kind: "increment", increment: 1 }]);
    // The server's schedule knew EP 21 had aired, and that EP 22 is next week.
    const fresh = { upComingAirDate: { episode: [{ airingAt: Math.floor(NOW / 1000) + 7 * 86_400, episode: 22, timeUntilAiring: null }] } };
    r.logs[0].d.resolve({ userData: ud(21), previous: ud(20), snapshot: fresh });
    await flush();
    expect(fields).toEqual([fresh]);
    expect(r.lastView().episodeProgressNumber).toBe(21);
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual(["Episode 21 logged for Knight. Caught up."]);
    // Now the cap is exact again: the next tap is refused here.
    expect(r.queue.tap({ ...behind, ...fresh }, ud(21), "Knight")).toBe(false);
  });

  it("names the server's no-op from the schedule it sent back", async () => {
    const stillBehind = rig();
    stillBehind.queue.tap(behind, ud(20), "Knight");
    await flush();
    stillBehind.logs[0].d.resolve({ userData: ud(20), previous: ud(20), snapshot: { upComingAirDate: behind.upComingAirDate } });
    await flush();
    vi.advanceTimersByTime(700);
    expect(stillBehind.said.map((m) => m.text)).toEqual([
      "Nothing logged: caught up on Knight as far as this page knows. Reload to check.",
    ]);
    // The server's fresher schedule says EP 21 is next week: nothing new has aired.
    const known = rig();
    known.queue.tap(behind, ud(20), "Knight");
    await flush();
    known.logs[0].d.resolve({ userData: ud(20), previous: ud(20), snapshot: nextWeek });
    await flush();
    vi.advanceTimersByTime(700);
    expect(known.said.map((m) => m.text)).toEqual(["Nothing logged: no new episode has aired yet. Knight is at Ep 20 / 24."]);
    expect(known.lastActivity()?.undo ?? null).toBeNull();
  });

  it("names only what the server logged when it capped a batch", async () => {
    const r = rig();
    r.queue.tap(behind, ud(19), "Knight");
    r.queue.tap(behind, ud(19), "Knight");
    r.queue.tap(behind, ud(19), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(20), previous: ud(19), snapshot: { upComingAirDate: behind.upComingAirDate } });
    await flush();
    expect(r.logs[1].op).toEqual({ kind: "increment", increment: 2 });
    r.logs[1].d.resolve({ userData: ud(20), previous: ud(20), snapshot: { upComingAirDate: behind.upComingAirDate } });
    await flush();
    vi.advanceTimersByTime(700);
    // EP 20 is only the latest the page knows of: no "Caught up." claim.
    expect(r.said.map((m) => m.text)).toEqual(["Episode 20 logged for Knight. 4 to go."]);
    expect(r.lastActivity()?.undo).toMatchObject({ n: 1 });
  });
});

describe("the aired cap: review fixes", () => {
  it("never creates a track on a refusal, so a later value the page shows is used", () => {
    const r = rig();
    // Caught up at 19: refused, and nothing is kept.
    expect(r.queue.tap(media, ud(19), "Knight")).toBe(false);
    // The list re-read says 18 (another device's Undo): the next tap starts from it.
    expect(r.queue.tap(media, ud(18), "Knight")).toBe(true);
    expect(r.lastView().episodeProgressNumber).toBe(19);
  });

  it("keeps the burst flag up until the burst's line is said", async () => {
    const r = rig();
    r.queue.tap(media, ud(18), "Knight");
    expect(r.lastActivity()?.burst).toBe(true);
    await flush();
    r.logs[0].d.resolve({ userData: ud(19), previous: ud(18) });
    await flush();
    expect(r.lastActivity()?.burst).toBe(true);
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual(["Episode 19 logged for Knight. Caught up."]);
    expect(r.lastActivity()).toMatchObject({ burst: false });
  });

  it("doesn't claim caught up when the server's clock is behind the page's", async () => {
    const r = rig();
    // EP 20's air time has passed by this page's clock: 20 aired (at least).
    const behind: TrackMedia = {
      ...media,
      upComingAirDate: { episode: [{ airingAt: Math.floor(NOW / 1000) - 60, episode: 20, timeUntilAiring: null }] },
    };
    r.queue.tap(behind, ud(19), "Knight");
    await flush();
    r.logs[0].d.resolve({ userData: ud(19), previous: ud(19), snapshot: { upComingAirDate: behind.upComingAirDate } });
    await flush();
    vi.advanceTimersByTime(700);
    expect(r.said.map((m) => m.text)).toEqual([
      "Nothing logged: the server doesn't count a new episode as aired yet. Knight is at Ep 19 / 24.",
    ]);
  });
});
