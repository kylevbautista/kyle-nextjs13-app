import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import type { UserAnimeData } from "@/lib/anime/types";
import type { UserDataRequest } from "@/lib/anime/userDataRequest";
import { casFilter, pin, writeUserData } from "./userDataWrite";

const USER = new ObjectId("65f000000000000000000001");
const NOW = Date.UTC(2026, 9, 4, 18);
const day = Date.UTC(2026, 6, 4);

const userData = (overrides: Partial<UserAnimeData> = {}): UserAnimeData => ({
  listType: "watching",
  episodeProgressNumber: 5,
  startDate: day,
  finishDate: null,
  score: null,
  ...overrides,
});
const entry = (id: number, ud: unknown, extra: Record<string, unknown> = {}) => ({ id, episodes: 12, userData: ud, ...extra });

type Elem = Record<string, unknown>;

/** Evaluates the operators casFilter emits ($eq / $type, dotted userData paths). */
function matches(elem: Elem, match: Record<string, unknown>) {
  return Object.entries(match).every(([path, cond]) => {
    const value = path.split(".").reduce<unknown>(
      (obj, key) => (obj && typeof obj === "object" && !Array.isArray(obj) ? (obj as Elem)[key] : undefined),
      elem
    );
    if (typeof cond !== "object" || cond === null) return value === cond;
    const op = cond as { $eq?: unknown; $type?: string };
    if ("$eq" in op) return op.$eq === null ? value === null || value === undefined : value === op.$eq;
    if (op.$type === "array") return Array.isArray(value);
    if (op.$type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
    throw new Error(`unexpected condition ${JSON.stringify(cond)}`);
  });
}

/** A one-user fake of the two collection calls writeUserData makes. */
function fakeUsers(following: Elem[], { beforeWrite }: { beforeWrite?: (list: Elem[], attempt: number) => void } = {}) {
  let writes = 0;
  const users = {
    following,
    findOne: vi.fn(async (query: { "following.id": number }) => {
      const found = following.find((item) => item.id === query["following.id"]);
      return found ? { _id: USER, following: [structuredClone(found)] } : null;
    }),
    updateOne: vi.fn(async (filter: { following: { $elemMatch: Record<string, unknown> } }, update: { $set: Record<string, unknown> }) => {
      beforeWrite?.(following, writes++);
      const index = following.findIndex((item) => matches(item, filter.following.$elemMatch));
      if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
      following[index] = { ...following[index], userData: update.$set["following.$.userData"] };
      return { matchedCount: 1, modifiedCount: 1 };
    }),
  };
  return users;
}

const write = (users: ReturnType<typeof fakeUsers>, request: UserDataRequest, animeId = 1) =>
  writeUserData(users as never, { userId: USER, animeId, request, now: () => NOW });

const inc = (increment: number): UserDataRequest => ({ kind: "increment", increment });

describe("pin", () => {
  it("pins raw values with operators only", () => {
    expect(pin(undefined)).toEqual({ $eq: null });
    expect(pin(null)).toEqual({ $eq: null });
    expect(pin(5)).toEqual({ $eq: 5 });
    expect(pin("5")).toEqual({ $eq: "5" });
    expect(pin([1])).toEqual({ $type: "array" });
    expect(pin({ b: 1, 1: 2 })).toEqual({ $type: "object" });
    expect(pin(Object.create(null))).toEqual({ $type: "object" });
    const date = new Date(day);
    expect(pin(date)).toEqual({ $eq: date });
    // A hostile stored object stays inside an operator, never a condition of its own.
    expect(pin({ $gt: "" })).toEqual({ $type: "object" });
  });
});

describe("casFilter", () => {
  it("pins id, episodes and every userData field in one $elemMatch", () => {
    expect(casFilter(USER, 1, entry(1, userData()))).toEqual({
      _id: USER,
      following: {
        $elemMatch: {
          id: 1,
          episodes: { $eq: 12 },
          "userData.listType": { $eq: "watching" },
          "userData.episodeProgressNumber": { $eq: 5 },
          "userData.startDate": { $eq: day },
          "userData.finishDate": { $eq: null },
          "userData.score": { $eq: null },
        },
      },
    });
  });
  it("pins legacy and junk values as they are stored", () => {
    const missing = casFilter(USER, 1, { id: 1 }) as { following: { $elemMatch: Record<string, unknown> } };
    expect(missing.following.$elemMatch["userData.listType"]).toEqual({ $eq: null });
    expect(missing.following.$elemMatch.episodes).toEqual({ $eq: null });
    const junk = casFilter(USER, 1, entry(1, { episodeProgressNumber: "5", score: { b: 1 }, startDate: [1] })) as {
      following: { $elemMatch: Record<string, unknown> };
    };
    expect(junk.following.$elemMatch["userData.episodeProgressNumber"]).toEqual({ $eq: "5" });
    expect(junk.following.$elemMatch["userData.score"]).toEqual({ $type: "object" });
    expect(junk.following.$elemMatch["userData.startDate"]).toEqual({ $type: "array" });
  });
});

describe("writeUserData", () => {
  it("applies an increment to the stored value and reports what it replaced", async () => {
    const users = fakeUsers([entry(1, userData())]);
    await expect(write(users, inc(2))).resolves.toMatchObject({
      kind: "ok",
      userData: userData({ episodeProgressNumber: 7 }),
      previous: userData(),
    });
    expect((users.following[0].userData as UserAnimeData).episodeProgressNumber).toBe(7);
  });

  it("re-reads after losing a race, so concurrent +1s all count", async () => {
    // Another request moves 5 → 6 between this request's read and its write.
    const users = fakeUsers([entry(1, userData())], {
      beforeWrite: (list, attempt) => {
        if (attempt === 0) list[0] = { ...list[0], userData: userData({ episodeProgressNumber: 6 }) };
      },
    });
    await expect(write(users, inc(1))).resolves.toMatchObject({
      kind: "ok",
      userData: userData({ episodeProgressNumber: 7 }),
      previous: userData({ episodeProgressNumber: 6 }),
    });
    expect(users.findOne).toHaveBeenCalledTimes(2);
  });

  it("recomputes the dialog's tracker rules against the replaced value", async () => {
    // Progress 12 would complete the Watching show that was read; meanwhile it was dropped
    // elsewhere, and a Dropped show isn't auto-completed.
    const users = fakeUsers([entry(1, userData({ episodeProgressNumber: 9 }))], {
      beforeWrite: (list, attempt) => {
        if (attempt === 0) list[0] = { ...list[0], userData: userData({ listType: "dropped", episodeProgressNumber: 9 }) };
      },
    });
    const result = await write(users, { kind: "set", userData: { episodeProgressNumber: 12 }, expect: null });
    expect(result).toMatchObject({
      kind: "ok",
      userData: userData({ listType: "dropped", episodeProgressNumber: 12 }),
      previous: userData({ listType: "dropped", episodeProgressNumber: 9 }),
    });
  });

  it("gives up after three lost races, with no userData", async () => {
    let n = 5;
    const users = fakeUsers([entry(1, userData())], {
      beforeWrite: (list) => {
        list[0] = { ...list[0], userData: userData({ episodeProgressNumber: ++n }) };
      },
    });
    await expect(write(users, inc(1))).resolves.toEqual({ kind: "busy" });
    expect(users.updateOne).toHaveBeenCalledTimes(3);
  });

  it("reports a removal mid-loop as not found", async () => {
    const users = fakeUsers([entry(1, userData())], {
      beforeWrite: (list) => {
        list.splice(0, 1);
      },
    });
    await expect(write(users, inc(1))).resolves.toEqual({ kind: "not-found" });
    await expect(write(fakeUsers([]), inc(1))).resolves.toEqual({ kind: "not-found" });
  });

  it("writes nothing when nothing changes", async () => {
    const done = userData({ listType: "completed", episodeProgressNumber: 12, finishDate: day });
    const users = fakeUsers([entry(1, done)]);
    await expect(write(users, inc(1))).resolves.toMatchObject({ kind: "ok", userData: done, previous: done });
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("counts a match that modified nothing as written", async () => {
    const users = fakeUsers([entry(1, userData())]);
    users.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 0 });
    await expect(write(users, inc(1))).resolves.toMatchObject({ kind: "ok" });
  });

  it("never retries a thrown error", async () => {
    const users = fakeUsers([entry(1, userData())]);
    users.updateOne.mockRejectedValueOnce(new Error("boom"));
    await expect(write(users, inc(1))).rejects.toThrow("boom");
    expect(users.updateOne).toHaveBeenCalledTimes(1);
  });

  it("refuses an Undo when the entry changed, and returns the stored value", async () => {
    const stored = userData({ episodeProgressNumber: 7 });
    const users = fakeUsers([entry(1, stored)]);
    await expect(
      write(users, { kind: "set", userData: userData(), expect: userData({ episodeProgressNumber: 6 }) })
    ).resolves.toEqual({ kind: "changed", userData: stored });
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("reports invalid data", async () => {
    await expect(
      write(fakeUsers([entry(1, userData())]), { kind: "set", userData: { score: 11 }, expect: null })
    ).resolves.toEqual({ kind: "invalid", error: "Score must be between 0 and 10" });
  });

  it("writes the first of two equal duplicates (the one lists show)", async () => {
    const users = fakeUsers([entry(1, userData()), entry(2, userData()), entry(1, userData())]);
    await write(users, inc(1));
    expect((users.following[0].userData as UserAnimeData).episodeProgressNumber).toBe(6);
    expect((users.following[2].userData as UserAnimeData).episodeProgressNumber).toBe(5);
  });

  it("writes a junk legacy entry on the first attempt (no permanent lock)", async () => {
    const users = fakeUsers([{ id: 1, episodes: 12, userData: { episodeProgressNumber: "5", score: { b: 1, 1: 2 } } }]);
    const result = await write(users, inc(1));
    expect(result).toMatchObject({ kind: "ok", userData: { episodeProgressNumber: 6, listType: "watching", score: null } });
    expect(users.updateOne).toHaveBeenCalledTimes(1);
    const noUserData = fakeUsers([{ id: 1, episodes: 12 }]);
    await expect(write(noUserData, inc(1))).resolves.toMatchObject({ kind: "ok", userData: { episodeProgressNumber: 1 } });
    expect(noUserData.updateOne).toHaveBeenCalledTimes(1);
  });
});

describe("catch-up snapshot", () => {
  it("returns the stored airing fields the request counted from", async () => {
    const users = fakeUsers([entry(1, userData(), { status: "RELEASING", upComingAirDate: { episode: [{ airingAt: 2_000_000_000, episode: 8 }] } })]);
    const result = await write(users, { kind: "catchUp", catchUpTo: 7 });
    expect(result).toMatchObject({
      kind: "ok",
      userData: { episodeProgressNumber: 7 },
      snapshot: { status: "RELEASING", episodes: 12, upComingAirDate: { episode: [{ airingAt: 2_000_000_000, episode: 8 }] } },
    });
  });
});
