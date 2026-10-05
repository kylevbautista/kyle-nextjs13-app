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

const { CARD_PROJECTION, loadListEntries, readEntries, readEntriesCached, readListCard } = await import("./userList");
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
