import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getAniListData } from "./getAniListData";

const media = (id: number) => ({
  id,
  idMal: id + 1000,
  title: { romaji: `Show ${id}`, english: null, native: null },
  description: "Hello <script>alert(1)</script><br>world",
  coverImage: { extraLarge: "https://s4.anilist.co/x.jpg", large: null, medium: null, color: null },
  genres: ["Action"],
  studios: { nodes: [{ name: "Studio" }] },
  externalLinks: [],
  upComingAirDate: { episode: [] },
  firstEpisode: { episode: [] },
});

const pageBody = (ids: number[], hasNextPage = false) => ({
  data: { page: { pageInfo: { hasNextPage }, media: ids.map(media) } },
});

const respond = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

/** Delays (ms) passed to setTimeout, ignoring fetchWithTimeout's abort timer. */
const sleeps = (spy: MockInstance<typeof setTimeout>) =>
  spy.mock.calls.map(([, ms]) => ms).filter((ms) => ms !== 8_000);

describe("getAniListData", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let timeoutSpy: MockInstance<typeof setTimeout>;

  beforeEach(() => {
    vi.useFakeTimers();
    timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const run = async (options: Parameters<typeof getAniListData>[0]) => {
    const promise = getAniListData(options);
    await vi.runAllTimersAsync();
    return promise;
  };

  it("returns normalized media and does not sleep when the rate-limit header is missing", async () => {
    fetchMock.mockResolvedValueOnce(respond(pageBody([1, 2], true)));
    const result = await run({ page: 1, year: 2026, season: "fall" });

    expect(result).toMatchObject({ ok: true, hasNextPage: true, page: 1 });
    if (!result.ok) throw new Error("expected ok");
    expect(result.media.map((m) => m.id)).toEqual([1, 2]);
    expect(result.media[0].description).toBe("Hello <br>world");
    expect(sleeps(timeoutSpy)).toEqual([]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables).toEqual({ page: 1, year: 2026, season: "FALL" });
  });

  it("does not sleep when plenty of requests remain", async () => {
    fetchMock.mockResolvedValueOnce(respond(pageBody([1]), 200, { "x-ratelimit-remaining": "25" }));
    await run({ year: 2026, season: "fall" });
    expect(sleeps(timeoutSpy)).toEqual([]);
  });

  it("pauses when fewer than 10 requests remain", async () => {
    fetchMock.mockResolvedValueOnce(respond(pageBody([1]), 200, { "x-ratelimit-remaining": "4" }));
    const result = await run({ year: 2026, season: "fall" });
    expect(result.ok).toBe(true);
    expect(sleeps(timeoutSpy)).toEqual([2_000]);
  });

  it("waits Retry-After (capped at 5 s) on 429 and retries once", async () => {
    fetchMock
      .mockResolvedValueOnce(respond({}, 429, { "retry-after": "30" }))
      .mockResolvedValueOnce(respond(pageBody([7])));
    const result = await run({ year: 2026, season: "summer" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleeps(timeoutSpy)).toEqual([5_000]);
    expect(result.ok).toBe(true);
  });

  it("defaults to a 2 s wait without Retry-After and gives up after one retry", async () => {
    fetchMock
      .mockResolvedValueOnce(respond({}, 429))
      .mockResolvedValueOnce(respond({}, 429));
    const result = await run({ year: 2026, season: "summer" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleeps(timeoutSpy)).toEqual([2_000]);
    expect(result).toMatchObject({ ok: false, status: 429 });
  });

  it("reports non-200, missing media and network errors as failures", async () => {
    fetchMock.mockResolvedValueOnce(respond({}, 500));
    expect(await run({ year: 2026, season: "fall" })).toMatchObject({ ok: false, status: 500 });

    fetchMock.mockResolvedValueOnce(respond({ data: null, errors: [{ message: "Nope" }] }));
    expect(await run({ year: 2026, season: "fall" })).toMatchObject({ ok: false, error: "Nope" });

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await run({ year: 2026, season: "fall" })).toMatchObject({ ok: false, error: "offline" });
  });

  it("fails (and frees the queue) when the response body never finishes", async () => {
    const stalled = respond(pageBody([1]));
    vi.spyOn(stalled, "json").mockReturnValue(new Promise(() => {}));
    fetchMock.mockResolvedValueOnce(stalled);
    expect(await run({ year: 2026, season: "fall", timeout: 3_000 })).toMatchObject({
      ok: false,
      error: expect.stringContaining("timed out"),
    });

    fetchMock.mockResolvedValueOnce(respond(pageBody([2])));
    expect((await run({ year: 2026, season: "fall" })).ok).toBe(true);
  });

  it("runs concurrent requests one at a time", async () => {
    let active = 0;
    let maxActive = 0;
    fetchMock.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 100));
      active--;
      return respond(pageBody([1]));
    });

    const results = Promise.all([
      getAniListData({ year: 2026, season: "fall" }),
      getAniListData({ year: 2026, season: "winter" }),
      getAniListData({ year: 2026, season: "spring" }),
    ]);
    await vi.runAllTimersAsync();

    expect((await results).every((result) => result.ok)).toBe(true);
    expect(maxActive).toBe(1);
  });
});
