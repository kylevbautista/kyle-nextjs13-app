import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONNECTION_FAILED_MESSAGE,
  UPSTREAM_FAILED_MESSAGE,
  loadTopAnimePage,
  rateLimitedMessage,
} from "./loadTopAnimePage";

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

  it("passes MyAnimeList's wait on when it is rate limiting", async () => {
    stubFetch(Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "30" } }));
    expect(await loadTopAnimePage(3)).toEqual({
      ok: false,
      rateLimited: true,
      error: "MyAnimeList is limiting this site's requests right now. Try again in 30 seconds.",
    });
    stubFetch(Response.json({ error: "rate_limited" }, { status: 429 }));
    expect(await loadTopAnimePage(3)).toMatchObject({ rateLimited: true, error: rateLimitedMessage(null) });
  });

  it("blames MyAnimeList, not the reader's connection, when the server answered with an error", async () => {
    stubFetch(Response.json({ error: "upstream_error" }, { status: 502 }));
    expect(await loadTopAnimePage(3)).toEqual({ ok: false, rateLimited: false, error: UPSTREAM_FAILED_MESSAGE });
    stubFetch(new Response("An error occurred", { status: 504 }));
    expect(await loadTopAnimePage(3)).toMatchObject({ error: UPSTREAM_FAILED_MESSAGE });
  });

  it("blames the connection only when this site itself didn't answer (or something else answered)", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    expect(await loadTopAnimePage(3)).toEqual({ ok: false, rateLimited: false, error: CONNECTION_FAILED_MESSAGE });
    stubFetch(new Response("<html>captive portal</html>", { status: 200 }));
    expect(await loadTopAnimePage(3)).toMatchObject({ error: CONNECTION_FAILED_MESSAGE });
  });
});

describe("rateLimitedMessage", () => {
  it("states MyAnimeList's wait only when it's a sane whole number of seconds", () => {
    expect(rateLimitedMessage(45)).toMatch(/Try again in 45 seconds\.$/);
    expect(rateLimitedMessage(1)).toMatch(/Try again in 1 second\.$/);
    for (const value of [null, 0, -5, 2.5, 601]) {
      expect(rateLimitedMessage(value)).toMatch(/Wait up to a minute, then try again\.$/);
    }
  });
});
