import { describe, expect, it } from "vitest";
import { calendarDayMs, normalizeUserData } from "./normalize";
import type { UserAnimeData } from "./types";
import {
  CHANGED_ERROR,
  REQUIRED_ERROR,
  applyProgressRequest,
  applyUserDataRequest,
  isUserAnimeData,
  parseUserDataRequest,
  progressBody,
  sameUserData,
  type ProgressRequest,
  type TrackEntry,
} from "./userDataRequest";

const NOW = Date.UTC(2026, 9, 4, 18);
const TODAY = calendarDayMs(NOW);
const day = Date.UTC(2026, 6, 4);

const data = (overrides: Partial<UserAnimeData> = {}): UserAnimeData => ({
  listType: "watching",
  episodeProgressNumber: 5,
  startDate: day,
  finishDate: null,
  score: null,
  ...overrides,
});

/** A weekly show whose episode `next` airs at `airingAt` (unix seconds). */
const airingShow = (userData: UserAnimeData, next: number, airingAt: number, episodes: number | null = 12): TrackEntry => ({
  status: "RELEASING",
  episodes,
  upcomingEpisode: { id: 1, episode: next, timeUntilAiring: null, mediaId: 1 },
  upComingAirDate: { episode: [{ airingAt, episode: next, timeUntilAiring: null }] },
  userData,
});
const finishedShow = (userData: UserAnimeData, episodes: number | null = 24): TrackEntry => ({
  status: "FINISHED",
  episodes,
  upcomingEpisode: null,
  upComingAirDate: { episode: [] },
  userData,
});

const inc = (increment: number): ProgressRequest => ({ kind: "increment", increment });
const upTo = (catchUpTo: number): ProgressRequest => ({ kind: "catchUp", catchUpTo });
const LATER = Math.floor(NOW / 1000) + 3600;
const EARLIER = Math.floor(NOW / 1000) - 3600;

describe("parseUserDataRequest", () => {
  it("accepts the four bodies", () => {
    expect(parseUserDataRequest({ increment: 1 })).toEqual({ ok: true, request: { kind: "increment", increment: 1 } });
    expect(parseUserDataRequest({ catchUpTo: 7 })).toEqual({ ok: true, request: { kind: "catchUp", catchUpTo: 7 } });
    expect(parseUserDataRequest({ userData: { score: 8 } })).toEqual({
      ok: true,
      request: { kind: "set", userData: { score: 8 }, expect: null },
    });
    expect(parseUserDataRequest({ userData: data(), expect: data({ episodeProgressNumber: 6 }) })).toEqual({
      ok: true,
      request: { kind: "set", userData: data(), expect: data({ episodeProgressNumber: 6 }) },
    });
  });

  it("keeps the old 'required' string for empty bodies", () => {
    for (const body of [undefined, null, {}, { userData: null }, [], "x", 3]) {
      expect(parseUserDataRequest(body)).toEqual({ ok: false, error: REQUIRED_ERROR });
    }
  });

  it("rejects mixed bodies", () => {
    expect(parseUserDataRequest({ increment: 1, catchUpTo: 2 })).toEqual({
      ok: false,
      error: "Send increment or catchUpTo, not both",
    });
    expect(parseUserDataRequest({ increment: 1, userData: data() })).toEqual({
      ok: false,
      error: "Send userData or an increment, not both",
    });
    expect(parseUserDataRequest({ increment: 1, expect: data() })).toEqual({
      ok: false,
      error: "expect only goes with userData",
    });
    expect(parseUserDataRequest({ expect: data() })).toEqual({ ok: false, error: "expect only goes with userData" });
    expect(parseUserDataRequest({ userData: data(), expect: { listType: "watching" } })).toEqual({
      ok: false,
      error: "expect must be a complete userData object",
    });
  });

  it("only takes whole, bounded numbers", () => {
    for (const increment of ["2", 1.5, 0, -1, 101, NaN, Infinity, 2 ** 53, { $gt: 0 }, null]) {
      expect(parseUserDataRequest({ increment })).toEqual({
        ok: false,
        error: "Increment must be a whole number from 1 to 100",
      });
    }
    expect(parseUserDataRequest({ increment: 100 }).ok).toBe(true);
    for (const catchUpTo of [0, "7", 100_001, 7.5]) {
      expect(parseUserDataRequest({ catchUpTo })).toEqual({
        ok: false,
        error: "catchUpTo must be a whole number from 1 to 100000",
      });
    }
  });
});

describe("isUserAnimeData / sameUserData / progressBody", () => {
  it("checks every field", () => {
    expect(isUserAnimeData(data())).toBe(true);
    expect(isUserAnimeData({ ...data(), listType: "nope" })).toBe(false);
    expect(isUserAnimeData({ ...data(), episodeProgressNumber: -1 })).toBe(false);
    expect(isUserAnimeData({ ...data(), episodeProgressNumber: "5" })).toBe(false);
    expect(isUserAnimeData({ ...data(), score: undefined })).toBe(false);
    expect(isUserAnimeData({ ...data(), startDate: NaN })).toBe(false);
  });
  it("compares all five fields", () => {
    expect(sameUserData(data(), data())).toBe(true);
    for (const patch of [
      { listType: "paused" as const },
      { episodeProgressNumber: 6 },
      { startDate: null },
      { finishDate: day },
      { score: 7 },
    ]) {
      expect(sameUserData(data(), data(patch))).toBe(false);
    }
  });
  it("builds request bodies", () => {
    expect(progressBody(inc(3))).toEqual({ increment: 3 });
    expect(progressBody(upTo(9))).toEqual({ catchUpTo: 9 });
  });
});

describe("applyProgressRequest: increments", () => {
  // A finished show: every episode has aired, so only the episode count bounds a +1.
  const apply = (userData: UserAnimeData, req: ProgressRequest, episodes: number | null = 12) =>
    applyProgressRequest(finishedShow(userData, episodes), req, NOW);

  it("adds to the stored value", () => {
    expect(apply(data(), inc(1))).toEqual({ ok: true, value: data({ episodeProgressNumber: 6 }), changed: true });
  });
  it("starts a planned show, with a start date", () => {
    expect(apply(data({ listType: "planning", episodeProgressNumber: 0, startDate: null }), inc(3))).toEqual({
      ok: true,
      value: data({ episodeProgressNumber: 3, startDate: TODAY }),
      changed: true,
    });
  });
  it("completes a paused show at its finale", () => {
    expect(apply(data({ listType: "paused", episodeProgressNumber: 10 }), inc(2))).toEqual({
      ok: true,
      value: data({ listType: "completed", episodeProgressNumber: 12, finishDate: TODAY }),
      changed: true,
    });
  });
  it("clamps to the episode count", () => {
    const result = apply(data({ episodeProgressNumber: 11 }), inc(5));
    expect(result.ok && result.value.episodeProgressNumber).toBe(12);
  });
  it("never lowers progress or rewrites a finished entry", () => {
    const done = data({ listType: "completed", episodeProgressNumber: 12, finishDate: day });
    expect(apply(done, inc(1))).toEqual({ ok: true, value: done, changed: false });
    const legacy = data({ episodeProgressNumber: 30 });
    expect(applyProgressRequest(finishedShow(legacy), inc(1), NOW)).toEqual({ ok: true, value: legacy, changed: false });
  });
  it("handles unknown totals and the progress ceiling", () => {
    // A finished show with no episode count: nothing bounds it but the ceiling.
    const result = apply(data({ episodeProgressNumber: 1105 }), inc(2), null);
    expect(result.ok && result.value.episodeProgressNumber).toBe(1107);
    const top = apply(data({ episodeProgressNumber: 99_999 }), inc(100), null);
    expect(top.ok && top.value.episodeProgressNumber).toBe(100_000);
  });
});

describe("applyProgressRequest: increments stop at what has aired", () => {
  it("caps a batch at the last aired episode", () => {
    // EP 8 airs in an hour: 7 have aired.
    const capped = applyProgressRequest(airingShow(data(), 8, LATER), inc(5), NOW);
    expect(capped).toEqual({ ok: true, value: data({ episodeProgressNumber: 7 }), changed: true });
    const caughtUp = airingShow(data({ episodeProgressNumber: 7 }), 8, LATER);
    expect(applyProgressRequest(caughtUp, inc(1), NOW)).toEqual({ ok: true, value: caughtUp.userData, changed: false });
  });
  it("counts the next episode from its exact air time (the server's clock)", () => {
    const at = Math.floor(NOW / 1000);
    const aired = applyProgressRequest(airingShow(data({ episodeProgressNumber: 7 }), 8, at), inc(3), NOW);
    expect(aired.ok && aired.value.episodeProgressNumber).toBe(8);
    const notYet = applyProgressRequest(airingShow(data({ episodeProgressNumber: 7 }), 8, at + 1), inc(3), NOW);
    expect(notYet.ok && notYet.changed).toBe(false);
  });
  it("applies to every status", () => {
    const planned = data({ listType: "planning", episodeProgressNumber: 0, startDate: null });
    // EP 1 hasn't aired: nothing to log, and the show stays in Plan to Watch.
    const premiere = applyProgressRequest(airingShow(planned, 1, LATER), inc(1), NOW);
    expect(premiere).toEqual({ ok: true, value: planned, changed: false });
    // Aired episodes still start a planned show.
    const started = applyProgressRequest(airingShow(planned, 8, LATER), inc(2), NOW);
    expect(started).toEqual({ ok: true, value: data({ episodeProgressNumber: 2, startDate: TODAY }), changed: true });
    for (const listType of ["paused", "dropped", "completed"] as const) {
      const show = airingShow(data({ listType, episodeProgressNumber: 7 }), 8, LATER);
      expect(applyProgressRequest(show, inc(1), NOW)).toEqual({ ok: true, value: show.userData, changed: false });
    }
  });
  it("never lowers progress logged ahead of the schedule", () => {
    const ahead = airingShow(data({ episodeProgressNumber: 9 }), 8, LATER);
    expect(applyProgressRequest(ahead, inc(1), NOW)).toEqual({ ok: true, value: ahead.userData, changed: false });
  });
  it("doesn't cap when the aired count is unknown", () => {
    // Next episode TBA.
    const tba: TrackEntry = { ...airingShow(data(), 8, LATER), upcomingEpisode: null, upComingAirDate: { episode: [] } };
    const tbaResult = applyProgressRequest(tba, inc(10), NOW);
    expect(tbaResult.ok && tbaResult.value.episodeProgressNumber).toBe(12);
    // A split cour numbered continuously ("EP 14" of 12): only the episode count bounds it.
    const split = applyProgressRequest(airingShow(data(), 14, LATER, 12), inc(10), NOW);
    expect(split.ok && split.value.episodeProgressNumber).toBe(12);
  });
  it("stays strict past the stored schedule's horizon (the server's count)", () => {
    // EP 8's air time has passed: 8 aired at least; the server logs no further.
    const result = applyProgressRequest(airingShow(data(), 8, EARLIER), inc(5), NOW);
    expect(result.ok && result.value.episodeProgressNumber).toBe(8);
  });
  it("completes an airing show once its finale has aired", () => {
    const result = applyProgressRequest(airingShow(data({ episodeProgressNumber: 11 }), 12, EARLIER), inc(1), NOW);
    expect(result).toEqual({
      ok: true,
      value: data({ listType: "completed", episodeProgressNumber: 12, finishDate: TODAY }),
      changed: true,
    });
  });
  it("caps long runners with an unknown total", () => {
    // EP 1110 airs in an hour: 1109 have aired.
    const show = airingShow(data({ episodeProgressNumber: 1105 }), 1110, LATER, null);
    const two = applyProgressRequest(show, inc(2), NOW);
    expect(two.ok && two.value.episodeProgressNumber).toBe(1107);
    const many = applyProgressRequest(show, inc(10), NOW);
    expect(many.ok && many.value.episodeProgressNumber).toBe(1109);
  });
});

describe("applyProgressRequest: catch-up", () => {
  it("logs only what has aired", () => {
    // EP 8 airs in an hour: 7 have aired.
    const show = airingShow(data(), 8, LATER);
    const to7 = applyProgressRequest(show, upTo(7), NOW);
    expect(to7.ok && to7.value.episodeProgressNumber).toBe(7);
    const to8 = applyProgressRequest(show, upTo(8), NOW);
    expect(to8.ok && to8.value.episodeProgressNumber).toBe(7);
  });
  it("never logs past the request, and does nothing when caught up", () => {
    const show = airingShow(data({ episodeProgressNumber: 7 }), 8, LATER);
    expect(applyProgressRequest(show, upTo(6), NOW)).toEqual({ ok: true, value: show.userData, changed: false });
    expect(applyProgressRequest(show, upTo(8), NOW)).toEqual({ ok: true, value: show.userData, changed: false });
    const partial = applyProgressRequest(airingShow(data({ episodeProgressNumber: 3 }), 8, LATER), upTo(5), NOW);
    expect(partial.ok && partial.value.episodeProgressNumber).toBe(5);
  });
  it("counts an episode from its exact air time", () => {
    const at = Math.floor(NOW / 1000);
    const now = applyProgressRequest(airingShow(data(), 8, at), upTo(8), NOW);
    expect(now.ok && now.value.episodeProgressNumber).toBe(8);
    const before = applyProgressRequest(airingShow(data(), 8, at + 1), upTo(8), NOW);
    expect(before.ok && before.value.episodeProgressNumber).toBe(7);
    const after = applyProgressRequest(airingShow(data(), 8, EARLIER), upTo(8), NOW);
    expect(after.ok && after.value.episodeProgressNumber).toBe(8);
  });
  it("completes a finished show", () => {
    expect(applyProgressRequest(finishedShow(data({ episodeProgressNumber: 22 })), upTo(24), NOW)).toEqual({
      ok: true,
      value: data({ listType: "completed", episodeProgressNumber: 24, finishDate: TODAY }),
      changed: true,
    });
  });
  it("resumes a paused show", () => {
    const result = applyProgressRequest(airingShow(data({ listType: "paused" }), 8, LATER), upTo(7), NOW);
    expect(result.ok && result.value).toEqual(data({ episodeProgressNumber: 7 }));
  });
  it("does nothing for other statuses", () => {
    for (const listType of ["planning", "completed", "dropped"] as const) {
      const show = finishedShow(data({ listType, episodeProgressNumber: 2 }));
      expect(applyProgressRequest(show, upTo(24), NOW)).toEqual({ ok: true, value: show.userData, changed: false });
    }
  });
});

describe("Undo round trip", () => {
  // Undo sends the exact previous userData (with every field) against the value the +1 saved.
  const cases: [string, TrackEntry, ProgressRequest][] = [
    ["+1", airingShow(data(), 8, LATER), inc(1)],
    ["planned show started", airingShow(data({ listType: "planning", episodeProgressNumber: 0, startDate: null }), 8, LATER), inc(1)],
    ["paused show resumed", airingShow(data({ listType: "paused" }), 8, LATER), inc(2)],
    ["finale", finishedShow(data({ episodeProgressNumber: 11 }), 12), inc(1)],
    ["paused to the finale", finishedShow(data({ listType: "paused", episodeProgressNumber: 10 }), 12), inc(2)],
    ["capped batch", airingShow(data(), 8, LATER), inc(5)],
    ["catch-up to the finale", finishedShow(data({ episodeProgressNumber: 22 })), upTo(24)],
    ["legacy progress without a start date", airingShow(data({ startDate: null, episodeProgressNumber: 3 }), 8, LATER), inc(1)],
    ["rewatch keeps its finish date", airingShow(data({ finishDate: day, episodeProgressNumber: 2, score: 9 }), 8, LATER), inc(1)],
    ["one-episode planned movie", { ...finishedShow(data({ listType: "planning", episodeProgressNumber: 0, startDate: null }), 1) }, inc(1)],
  ];
  it.each(cases)("restores %s exactly", (_name, entry, req) => {
    const applied = applyProgressRequest(entry, req, NOW);
    expect(applied.ok && applied.changed).toBe(true);
    if (!applied.ok) return;
    const undo = applyUserDataRequest(
      { kind: "set", userData: entry.userData, expect: applied.value },
      { ...entry, userData: applied.value },
      NOW
    );
    expect(undo).toEqual({ ok: true, value: entry.userData, changed: true });
    // The same through normalizeUserData directly.
    const direct = normalizeUserData(entry.userData, { episodes: entry.episodes ?? null, previous: applied.value, now: NOW });
    expect(direct).toEqual({ ok: true, value: entry.userData });
  });
});

describe("applyUserDataRequest: set", () => {
  it("refuses an undo when any field changed", () => {
    const stored = data({ episodeProgressNumber: 6 });
    for (const patch of [
      { listType: "paused" as const },
      { episodeProgressNumber: 7 },
      { startDate: null },
      { finishDate: day },
      { score: 8 },
    ]) {
      expect(
        applyUserDataRequest(
          { kind: "set", userData: data(), expect: stored },
          airingShow({ ...stored, ...patch }, 8, LATER),
          NOW
        )
      ).toEqual({ ok: false, error: CHANGED_ERROR, code: "changed" });
    }
  });
  it("applies an absolute write against the stored value", () => {
    // Progress typed to the finale completes it, as the dialog's saves always have.
    expect(
      applyUserDataRequest(
        { kind: "set", userData: { episodeProgressNumber: 12 }, expect: null },
        airingShow(data({ episodeProgressNumber: 9 }), 8, LATER),
        NOW
      )
    ).toEqual({
      ok: true,
      value: data({ listType: "completed", episodeProgressNumber: 12, finishDate: TODAY }),
      changed: true,
    });
    expect(
      applyUserDataRequest({ kind: "set", userData: { score: null }, expect: null }, airingShow(data(), 8, LATER), NOW)
    ).toEqual({ ok: true, value: data(), changed: false });
    expect(applyUserDataRequest({ kind: "set", userData: "x", expect: null }, airingShow(data(), 8, LATER), NOW)).toEqual({
      ok: false,
      error: "userData must be an object",
    });
  });
});
