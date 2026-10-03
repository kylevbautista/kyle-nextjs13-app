import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTopAnimePage, MyAnimeListError } from "./myanimelist";

/** One entry of MAL's ranking (lib/topAnime.test.ts covers the parsing itself). */
const malEntry = (node: Record<string, unknown> = {}, rank = 1) => ({
  node: { id: 52991, title: "Sousou no Frieren", mean: 9.25, num_list_users: 1524761, media_type: "tv", ...node },
  ranking: { rank },
});

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

const rankingPage = (data: unknown[], next = true) => ({
  data,
  paging: next ? { next: "https://api.myanimelist.net/v2/anime/ranking?offset=25" } : {},
});

// Retry-After: 0 keeps the retry path fast without fake timers.
const rateLimited = (retryAfter = "0") =>
  new Response(JSON.stringify({ error: "too_many_requests" }), { status: 429, headers: { "Retry-After": retryAfter } });

const stubFetch = (...responses: (Response | Error)[]) => {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  vi.stubEnv("MAL_CLIENT_ID", "test-client-id");
  vi.stubEnv("MAL_API_URL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("fetchTopAnimePage", () => {
  it("asks MAL's ranking for one 25-show page with the Client ID, and parses it", async () => {
    const fetchMock = stubFetch(jsonResponse(rankingPage([malEntry({ id: 2 }, 27), malEntry({ id: 1 }, 26)], false)));
    const page = await fetchTopAnimePage(2);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe("https://api.myanimelist.net/v2/anime/ranking");
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({ ranking_type: "all", limit: "25", offset: "25" });
    expect(parsed.searchParams.get("fields")).toContain("num_list_users");
    expect(init.headers).toMatchObject({ "X-MAL-CLIENT-ID": "test-client-id" });
    // The ISR page's default fetch: no data cache, so "fetched at" stays true.
    expect(init.cache).toBeUndefined();
    expect(page.items.map((item) => item.rank)).toEqual([26, 27]);
    expect(page.hasNextPage).toBe(false);
    expect(page.currentPage).toBe(2);
  });

  it("caches in Next's data cache only when asked", async () => {
    const fetchMock = stubFetch(jsonResponse(rankingPage([malEntry()])));
    await fetchTopAnimePage(3, { cacheSeconds: 3600 });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "force-cache", next: { revalidate: 3600 } });
  });

  it("honors MAL_API_URL (the test rig's stub)", async () => {
    vi.stubEnv("MAL_API_URL", "http://localhost:4200/v2/");
    const fetchMock = stubFetch(jsonResponse(rankingPage([malEntry()])));
    await fetchTopAnimePage(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^http:\/\/localhost:4200\/v2\/anime\/ranking\?/);
  });

  it("throws a clear error without a Client ID, before any request", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "");
    const fetchMock = stubFetch();
    await expect(fetchTopAnimePage(1)).rejects.toThrow(/MAL_CLIENT_ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries a 429 and then succeeds", async () => {
    const fetchMock = stubFetch(rateLimited(), jsonResponse(rankingPage([malEntry()])));
    const page = await fetchTopAnimePage(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(1);
  });

  it("throws after the last attempt so ISR keeps the previous page", async () => {
    const fetchMock = stubFetch(rateLimited(), rateLimited(), rateLimited());
    await expect(fetchTopAnimePage(1)).rejects.toMatchObject({ name: "MyAnimeListError", status: 429, retryAfterSeconds: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("takes the number of attempts from the caller", async () => {
    const fetchMock = stubFetch(rateLimited(), rateLimited());
    await expect(fetchTopAnimePage(4, { attempts: 2 })).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors (a bad Client ID is a 400)", async () => {
    const fetchMock = stubFetch(new Response('{"message":"Invalid client id","error":"bad_request"}', { status: 400 }));
    await expect(fetchTopAnimePage(1)).rejects.toBeInstanceOf(MyAnimeListError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not wait out a long Retry-After, but reports it", async () => {
    const fetchMock = stubFetch(rateLimited("60"));
    await expect(fetchTopAnimePage(1)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 60 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries network failures, then throws", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(new TypeError("fetch failed"), new TypeError("fetch failed"), new TypeError("fetch failed"));
    const pending = fetchTopAnimePage(1).catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const err = await pending;
    expect(err).toBeInstanceOf(MyAnimeListError);
    expect(String((err as Error).message)).toMatch(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws on a malformed body", async () => {
    stubFetch(jsonResponse({ status: "ok" }));
    await expect(fetchTopAnimePage(1)).rejects.toBeInstanceOf(MyAnimeListError);
  });
});
