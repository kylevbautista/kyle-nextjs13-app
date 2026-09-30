import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPEST_FALLBACK, TEMPEST_IDS } from "@/lib/landing";
import { loadLandingData } from "./landing";

// Tue Sep 29 2026 12:00 UTC: Fall 2026 starts in 2 days, so the landing previews it.
const NOW_MS = Date.UTC(2026, 8, 29, 12, 0);
const NOW_S = NOW_MS / 1000;
const HOUR = 3600;
const DAY = 86_400;

const show = (
  id: number,
  airingAt: number | null,
  {
    episode = 1,
    popularity = 100,
    season = "FALL",
    seasonYear = 2026,
    startDate = { year: 2026, month: 10, day: 1 },
    episodes = 12 as number | null,
  } = {}
) => ({
  id,
  title: { romaji: `Show ${id}`, english: null, native: null },
  format: "TV",
  status: season === "FALL" ? "NOT_YET_RELEASED" : "RELEASING",
  season,
  seasonYear,
  startDate,
  episodes,
  popularity,
  coverImage: { large: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/${id}.jpg` },
  upComingAirDate: { episode: airingAt ? [{ airingAt, episode, timeUntilAiring: 0 }] : [] },
});

/** Page 1 of Fall 2026 plus one Summer show still airing (a carry-over). */
const seasonBody = ({ hasNextPage = true, media = [
  show(1, NOW_S + 2 * DAY, { popularity: 500 }),
  show(2, NOW_S + HOUR, { popularity: 300 }),
  show(3, NOW_S + 40 * DAY, { popularity: 900 }), // outside the 16-day preview window
] } = {}) => ({
  data: {
    page: { pageInfo: { hasNextPage }, media },
    ended: { media: [] },
    airing: {
      media: [
        show(4, NOW_S + 3 * HOUR, {
          episode: 13,
          popularity: 800,
          season: "SUMMER",
          startDate: { year: 2026, month: 7, day: 5 },
          episodes: 24,
        }),
      ],
    },
  },
});

const tempest = (id: number, year: number, status = "FINISHED") => ({
  ...show(id, null, { season: "FALL", seasonYear: year, startDate: { year, month: 10, day: 2 } }),
  status,
  title: { romaji: `Tensei Shitara Slime ${id}`, english: `Slime ${id}`, native: null },
  bannerImage: id === 101280 ? "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101280.jpg" : null,
});

const extrasBody = () => ({
  data: {
    tempest: { media: [tempest(156822, 2024), tempest(101280, 2018), tempest(217331, 2027, "NOT_YET_RELEASED")] },
    mascot: {
      characters: [
        {
          id: 123962,
          image: { large: "https://s4.anilist.co/file/anilistcdn/character/large/b123962.png" },
          siteUrl: "https://anilist.co/character/123962",
        },
      ],
    },
    count1: { pageInfo: { hasNextPage: true }, media: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })) },
    count2: { pageInfo: { hasNextPage: false }, media: Array.from({ length: 24 }, (_, i) => ({ id: i + 51 })) },
    count3: { pageInfo: { hasNextPage: false }, media: [] },
  },
});

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Call = { query: string; variables: Record<string, unknown>; init: RequestInit & { next?: unknown } };

describe("loadLandingData", () => {
  let calls: Call[];
  let fetchMock: ReturnType<typeof vi.fn>;

  /** Routes each POST by its query: the season page or the LandingExtras query. */
  const route = (season: () => Response | Promise<Response>, extras: () => Response | Promise<Response>) =>
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      calls.push({ query: body.query, variables: body.variables, init });
      return String(body.query).includes("query LandingExtras") ? extras() : season();
    });

  const load = async () => {
    const promise = loadLandingData();
    await vi.runAllTimersAsync();
    return promise;
  };

  const extrasCalls = () => calls.filter((call) => call.query.includes("query LandingExtras"));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    calls = [];
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("spends one season request and one cached extras request, and shapes the page", async () => {
    route(
      () => respond(seasonBody()),
      () => respond(extrasBody())
    );
    const data = await load();

    expect(calls).toHaveLength(2);
    const [extras] = extrasCalls();
    expect(extras.variables).toEqual({
      ids: TEMPEST_IDS,
      characterId: 123962,
      season: "FALL",
      seasonYear: 2026,
    });
    expect(extras.init).toMatchObject({
      method: "POST",
      cache: "force-cache",
      next: { revalidate: 3600, tags: ["landing-extras"] },
    });

    expect(data.generatedAt).toBe(NOW_MS);
    expect(data.season).toMatchObject({
      label: "Fall 2026",
      preview: true,
      startsLabel: "October 1",
      seasonHref: "/anime/2026/fall",
      browseHref: "/anime/2026/fall",
      browseLabel: "Preview Fall 2026",
      showCount: "74",
      continuingCount: 1,
    });
    // Soonest first; show 3 is outside the window; the carry-over is marked continuing.
    expect(data.airingIds).toEqual([2, 4, 1]);
    expect(data.continuingIds).toEqual([4]);
    expect(Object.keys(data.mediaById).map(Number).sort((a, b) => a - b)).toEqual([
      1, 2, 4, 101280, 156822, 217331,
    ]);

    expect(data.tempest.live).toBe(true);
    expect(data.tempest.entries.map((entry) => entry.id)).toEqual([101280, 156822, 217331]);
    expect(data.tempest.entries[2]).toMatchObject({ upcoming: true });
    expect(data.tempest.bannerUrl).toContain("101280");
    expect(data.tempest.portraitUrl).toContain("b123962");
  });

  it("skips the extras when the season call already spent 2 requests (a 429 retry)", async () => {
    let seasonCalls = 0;
    route(
      () => (++seasonCalls === 1 ? respond({}, 429) : respond(seasonBody())),
      () => respond(extrasBody())
    );
    const data = await load();

    expect(calls).toHaveLength(2);
    expect(extrasCalls()).toHaveLength(0);
    expect(data.season?.showCount).toBe("3+"); // page 1 only, more pages exist
    expect(data.airingIds).toEqual([2, 4, 1]);
    expect(data.tempest).toMatchObject({ live: false, entries: TEMPEST_FALLBACK, bannerUrl: null });
    // Fallback Tempest entries are not addable, so they send no snapshots.
    expect(Object.keys(data.mediaById).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 4]);
  });

  it("outside a production server, renders fallbacks when AniList is down (at most 2 requests)", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      calls.push({ ...JSON.parse(String(init.body)), init });
      throw new TypeError("fetch failed");
    });
    const data = await load();

    expect(calls).toHaveLength(2);
    expect(data).toMatchObject({
      generatedAt: NOW_MS,
      season: null,
      airingIds: [],
      continuingIds: [],
      mediaById: {},
    });
    expect(data.tempest).toMatchObject({ live: false, entries: TEMPEST_FALLBACK });
  });

  describe("on a production server", () => {
    const failEverything = () =>
      fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
        calls.push({ ...JSON.parse(String(init.body)), init });
        throw new TypeError("fetch failed");
      });

    it("throws when the season request fails, so ISR keeps the last good page", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PHASE", "");
      failEverything();
      const promise = loadLandingData();
      const outcome = expect(promise).rejects.toThrow(/keeping the last good page/);
      await vi.runAllTimersAsync();
      await outcome;
      // It gives up before spending anything on the extras.
      expect(extrasCalls()).toHaveLength(0);
    });

    it("still renders the fallbacks during next build", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PHASE", "phase-production-build");
      failEverything();
      const data = await load();
      expect(data.season).toBeNull();
      expect(data.tempest.live).toBe(false);
    });

    it("degrades (doesn't throw) when only the extras fail", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PHASE", "");
      route(
        () => respond(seasonBody()),
        () => respond({}, 500)
      );
      const data = await load();
      expect(data.airingIds).toEqual([2, 4, 1]);
      expect(data.tempest.live).toBe(false);
    });
  });

  it("keeps the season live when only the extras fail", async () => {
    route(
      () => respond(seasonBody()),
      () => respond({ errors: [{ message: "Internal Server Error" }], data: null })
    );
    const data = await load();

    expect(calls).toHaveLength(2);
    expect(data.season?.showCount).toBe("3+");
    expect(data.airingIds).toEqual([2, 4, 1]);
    expect(data.tempest.live).toBe(false);
  });

  it("uses the season's own count when the extras answer with an error status", async () => {
    route(
      () => respond(seasonBody({ hasNextPage: false })),
      () => respond({}, 500)
    );
    const data = await load();
    expect(data.season?.showCount).toBe("3");
    expect(data.tempest.live).toBe(false);
  });

  it("hides the show count for an empty season", async () => {
    const empty = extrasBody();
    empty.data.count1 = { pageInfo: { hasNextPage: false }, media: [] };
    route(
      () => respond(seasonBody({ hasNextPage: false, media: [] })),
      () => respond(empty)
    );
    const data = await load();
    expect(data.season).toMatchObject({ label: "Fall 2026", showCount: null });
    // The carry-over still airs next.
    expect(data.airingIds).toEqual([4]);
  });
});
