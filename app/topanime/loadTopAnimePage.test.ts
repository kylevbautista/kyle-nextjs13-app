import { afterEach, describe, expect, it, vi } from "vitest";
import { LOAD_FAILED_MESSAGE, RATE_LIMITED_MESSAGE, loadTopAnimePage } from "./loadTopAnimePage";

const item = {
  malId: 1,
  rank: 26,
  title: "Show",
  titleEnglish: null,
  score: 8.9,
  imageUrl: null,
  type: "TV",
  episodes: 12,
  year: 2020,
  members: 1000,
};

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn();
  if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
  else fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe("loadTopAnimePage", () => {
  it("asks /api/top-anime and returns its page", async () => {
    const fetchMock = stubFetch(Response.json({ page: { items: [item], hasNextPage: true, currentPage: 2 } }));
    const result = await loadTopAnimePage(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/top-anime?page=2");
    expect(result).toEqual({ ok: true, page: { items: [item], hasNextPage: true, currentPage: 2 } });
  });

  it("says when MyAnimeList is rate limiting", async () => {
    stubFetch(Response.json({ error: "rate_limited" }, { status: 429 }));
    expect(await loadTopAnimePage(3)).toEqual({ ok: false, rateLimited: true, error: RATE_LIMITED_MESSAGE });
  });

  it("fails softly on upstream errors, odd bodies and network failures", async () => {
    stubFetch(Response.json({ error: "upstream_error" }, { status: 502 }));
    expect(await loadTopAnimePage(3)).toEqual({ ok: false, rateLimited: false, error: LOAD_FAILED_MESSAGE });
    stubFetch(new Response("<html>gateway</html>", { status: 200 }));
    expect(await loadTopAnimePage(3)).toMatchObject({ ok: false, rateLimited: false });
    stubFetch(new TypeError("Failed to fetch"));
    expect(await loadTopAnimePage(3)).toMatchObject({ ok: false, rateLimited: false });
  });
});
