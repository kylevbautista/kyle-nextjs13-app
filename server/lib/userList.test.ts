import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const findOne = vi.fn();
const updateOne = vi.fn();
vi.mock("./mongodb", () => ({ getDb: vi.fn(async () => ({ collection: () => ({ findOne, updateOne }) })) }));
vi.mock("./anilist", () => ({
  fetchMediaByIds: vi.fn(() => {
    throw new Error("AniList must not be called");
  }),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { CARD_PROJECTION, WIDGET_PROJECTION, loadListEntries, readEntries, readEntriesCached, readListCard, readWidgetOwner } =
  await import("./userList");
const { fetchMediaByIds } = await import("./anilist");
const { listShareCard, scheduleShareCard, shareVersion } = await import("@/components/og/shareCard");

const ID = "65f000000000000000000001";
const fullEntry = (id: number, airingAt: number, extra: Record<string, unknown> = {}) => ({
  id,
  idMal: id + 1000,
  title: { romaji: `Show ${id}`, english: null, native: null },
  description: "A <b>show</b>.",
  coverImage: { extraLarge: null, large: null, medium: null, color: "#123456" },
  season: "FALL",
  seasonYear: 2026,
  format: "TV",
  status: "RELEASING",
  episodes: 12,
  duration: 24,
  source: "MANGA",
  genres: ["Action"],
  averageScore: 80,
  popularity: 1000,
  studios: { nodes: [{ name: "Studio" }] },
  startDate: { year: 2026, month: 10, day: 1 },
  externalLinks: [],
  upcomingEpisode: { id: 1, episode: 4, timeUntilAiring: 0, mediaId: id },
  upComingAirDate: { episode: [{ airingAt, episode: 4, timeUntilAiring: 0 }] },
  firstEpisode: { episode: [{ airingAt: airingAt - 3 * 7 * 86_400, episode: 1 }] },
  userData: { listType: "watching", episodeProgressNumber: 3, startDate: null, finishDate: null, score: 8 },
  ...extra,
});
const MON = Date.UTC(2026, 8, 29, 2, 0) / 1000;

beforeEach(() => {
  findOne.mockReset();
  updateOne.mockReset();
});

describe("readListCard", () => {
  it("never queries for a non-canonical id", async () => {
    for (const id of ["65F000000000000000000001", Buffer.from("a@b.c").toString("base64url"), "og", ""]) {
      await expect(readListCard(id)).resolves.toBeNull();
    }
    expect(findOne).not.toHaveBeenCalled();
  });

  it("reads one projected document and the pages' normalization", async () => {
    findOne.mockResolvedValueOnce({ name: "Kyle Bautista", following: [fullEntry(1, MON), fullEntry(1, MON), fullEntry(2, MON)] });
    const card = await readListCard(ID);
    expect(findOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) }, { projection: CARD_PROJECTION });
    expect(card?.name).toBe("Kyle");
    expect(card?.entries.map((entry) => entry.id)).toEqual([1, 2]);
    findOne.mockResolvedValueOnce({ name: null, following: [] });
    expect((await readListCard(ID))?.name).toBe("Anonymous");
    findOne.mockResolvedValueOnce(null);
    await expect(readListCard(ID)).resolves.toBeNull();
    expect(fetchMediaByIds).not.toHaveBeenCalled();
  });

  it("projects exactly what the cards draw", () => {
    expect(Object.keys(CARD_PROJECTION)).toEqual([
      "name",
      "following.id",
      "following.status",
      "following.userData",
      "following.upComingAirDate",
    ]);
    const full = {
      _id: new ObjectId(ID),
      name: "Kyle",
      email: "k@example.test",
      following: [
        fullEntry(1, MON),
        fullEntry(2, MON + 86_400, { status: "FINISHED", userData: { listType: "completed", episodeProgressNumber: 12, startDate: null, finishDate: null, score: 9.5 } }),
        fullEntry(3, MON + 3 * 86_400, { userData: { listType: "planning", episodeProgressNumber: 0, startDate: null, finishDate: null, score: null } }),
      ],
    };
    const projected = {
      _id: full._id,
      name: full.name,
      following: full.following.map(({ id, status, userData, upComingAirDate }) => ({ id, status, userData, upComingAirDate })),
    };
    expect(shareVersion(listShareCard(readEntries(full), "Kyle"))).toBe(shareVersion(listShareCard(readEntries(projected), "Kyle")));
    expect(shareVersion(scheduleShareCard(readEntries(full), "Kyle"))).toBe(
      shareVersion(scheduleShareCard(readEntries(projected), "Kyle"))
    );
  });
});

describe("loadListEntries", () => {
  it("reads the stored snapshot only when refresh is off (a preview bot)", async () => {
    const doc = { _id: new ObjectId(ID), name: "Kyle", following: [fullEntry(1, MON), fullEntry(2, MON)], listRefreshedAt: 0 };
    await expect(loadListEntries(doc, { refresh: false })).resolves.toEqual(readEntries(doc));
    expect(updateOne).not.toHaveBeenCalled();
    expect(fetchMediaByIds).not.toHaveBeenCalled();
  });

  it("caches nothing outside a render", () => {
    const doc = { _id: new ObjectId(ID), following: [fullEntry(1, MON)] };
    expect(readEntriesCached(doc)).toEqual(readEntries(doc));
  });
});

describe("readWidgetOwner (the iPhone widget's read)", () => {
  it("rejects non-canonical ids without touching Mongo", async () => {
    for (const id of ["65F000000000000000000001", Buffer.from("a@b.c").toString("base64url"), "65f00000000000000000000", ""]) {
      await expect(readWidgetOwner(id)).resolves.toBeNull();
    }
    expect(findOne).not.toHaveBeenCalled();
  });

  it("projects only WIDGET_PROJECTION and normalizes like the pages", async () => {
    findOne.mockResolvedValueOnce({
      _id: new ObjectId(ID),
      name: "Kyle Bautista",
      listRefreshedAt: 5,
      following: [fullEntry(1, MON), fullEntry(1, MON), fullEntry(2, MON)],
    });
    const owner = await readWidgetOwner(ID);
    expect(findOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) }, { projection: WIDGET_PROJECTION });
    expect(owner?.user).toEqual({ _id: new ObjectId(ID), listRefreshedAt: 5 });
    expect(owner?.name).toBe("Kyle");
    expect(owner?.entries.map((entry) => entry.id)).toEqual([1, 2]);
    expect(Object.keys(WIDGET_PROJECTION).some((key) => /email|image|description|externalLinks|genres|score|startDate|finishDate/.test(key))).toBe(false);
    expect(fetchMediaByIds).not.toHaveBeenCalled();
  });

  it("names a nameless owner Anonymous; an unknown id is null", async () => {
    findOne.mockResolvedValueOnce({ _id: new ObjectId(ID), name: "  ", following: [] });
    expect((await readWidgetOwner(ID))?.name).toBe("Anonymous");
    // Bidi controls and zero-width characters never reach the widget (publicOwnerName strips them).
    findOne.mockResolvedValueOnce({ _id: new ObjectId(ID), name: "\u202EKyle Bautista", following: [] });
    expect((await readWidgetOwner(ID))?.name).toBe("Kyle");
    findOne.mockResolvedValueOnce({ _id: new ObjectId(ID), name: "\u200B\u2066", following: [] });
    expect((await readWidgetOwner(ID))?.name).toBe("Anonymous");
    // A word joiner or a Hangul filler passes for a blank name: still Anonymous.
    findOne.mockResolvedValueOnce({ _id: new ObjectId(ID), name: "\u2060\u3164", following: [] });
    expect((await readWidgetOwner(ID))?.name).toBe("Anonymous");
    findOne.mockResolvedValueOnce(null);
    await expect(readWidgetOwner(ID)).resolves.toBeNull();
  });

  it("keeps the refresh lock's fields through the projection (refreshEntriesIfStale reads them)", async () => {
    expect(WIDGET_PROJECTION).toMatchObject({ name: 1, listRefreshedAt: 1 });
    findOne.mockResolvedValueOnce({ _id: new ObjectId(ID), name: "Kyle", listRefreshedAt: 1234, following: [] });
    expect((await readWidgetOwner(ID))?.user).toEqual({ _id: new ObjectId(ID), listRefreshedAt: 1234 });
  });

  it("lets a Mongo error propagate", async () => {
    findOne.mockRejectedValueOnce(new Error("connection reset"));
    await expect(readWidgetOwner(ID)).rejects.toThrow("connection reset");
  });
});
