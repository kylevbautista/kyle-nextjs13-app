import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Module = typeof import("./myanimelist");
// Fresh module per test: the pause after a failure is module state.
let mal: Module;

/** One entry of MAL's ranking (lib/topAnime.test.ts covers the parsing itself). */
const malEntry = (node: Record<string, unknown> = {}, rank = 1) => ({
  node: { id: 52991, title: "Sousou no Frieren", rank, mean: 9.25, num_list_users: 1524761, media_type: "tv", ...node },
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

beforeEach(async () => {
  vi.stubEnv("MAL_CLIENT_ID", "test-client-id");
  vi.stubEnv("MAL_API_URL", "");
  vi.resetModules();
  mal = await import("./myanimelist");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("fetchTopAnimePage", () => {
  it("asks MAL's ranking for one 25-show page with the Client ID, and parses it", async () => {
    const fetchMock = stubFetch(jsonResponse(rankingPage([malEntry({ id: 2 }, 27), malEntry({ id: 1 }, 26)], false)));
    const { page } = await mal.fetchTopAnimePage(2);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe("https://api.myanimelist.net/v2/anime/ranking");
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({ ranking_type: "all", limit: "25", offset: "25" });
    expect(parsed.searchParams.get("fields")).toContain("num_list_users");
    expect(init.headers).toMatchObject({ "X-MAL-CLIENT-ID": "test-client-id" });
    // A default fetch: no cache option (an explicit no-store would make /topanime dynamic, CLAUDE.md §9.14).
    expect(init.cache).toBeUndefined();
    expect(init.next).toBeUndefined();
    expect(page.items.map((item) => item.rank)).toEqual([26, 27]);
    expect(page.hasNextPage).toBe(false);
    expect(page.currentPage).toBe(2);
  });

  it("dates the answer by MAL's Date header (a build can reuse a cached page 1), never later than now", async () => {
    stubFetch(jsonResponse(rankingPage([malEntry()]), { headers: { Date: "Sat, 03 Oct 2026 16:45:46 GMT" } }));
    expect((await mal.fetchTopAnimePage(1)).fetchedAt).toBe(Date.UTC(2026, 9, 3, 16, 45, 46));

    stubFetch(jsonResponse(rankingPage([malEntry()]), { headers: { Date: "Thu, 01 Jan 2099 00:00:00 GMT" } }));
    const before = Date.now();
    const future = (await mal.fetchTopAnimePage(1)).fetchedAt;
    expect(future).toBeGreaterThanOrEqual(before);
    expect(future).toBeLessThanOrEqual(Date.now());

    stubFetch(jsonResponse(rankingPage([malEntry()])));
    const missing = (await mal.fetchTopAnimePage(1)).fetchedAt;
    expect(Math.abs(missing - Date.now())).toBeLessThan(1000);
  });

  it("honors MAL_API_URL (the test rig's stub)", async () => {
    vi.stubEnv("MAL_API_URL", "http://localhost:4200/v2/");
    const fetchMock = stubFetch(jsonResponse(rankingPage([malEntry()])));
    await mal.fetchTopAnimePage(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^http:\/\/localhost:4200\/v2\/anime\/ranking\?/);
  });

  it("throws a clear error without a Client ID, before any request", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "");
    const fetchMock = stubFetch();
    await expect(mal.fetchTopAnimePage(1)).rejects.toThrow(/MAL_CLIENT_ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries a 429 and then succeeds", async () => {
    const fetchMock = stubFetch(rateLimited(), jsonResponse(rankingPage([malEntry()])));
    const { page } = await mal.fetchTopAnimePage(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(1);
  });

  it("throws after the last attempt so ISR keeps the previous page", async () => {
    const fetchMock = stubFetch(rateLimited(), rateLimited(), rateLimited());
    await expect(mal.fetchTopAnimePage(1)).rejects.toMatchObject({ name: "MyAnimeListError", status: 429, retryAfterSeconds: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("takes the number of attempts from the caller (the route uses one)", async () => {
    const fetchMock = stubFetch(new Response("", { status: 503 }));
    await expect(mal.fetchTopAnimePage(4, { attempts: 1 })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry client errors (a bad Client ID is a 400), and doesn't pause for them", async () => {
    const fetchMock = stubFetch(
      new Response('{"message":"Invalid client id","error":"bad_request"}', { status: 400 }),
      jsonResponse(rankingPage([malEntry()]))
    );
    await expect(mal.fetchTopAnimePage(1)).rejects.toBeInstanceOf(mal.MyAnimeListError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(mal.fetchTopAnimePage(1)).resolves.toBeTruthy();
  });

  it("does not wait out a long Retry-After, reports it, and pauses for it", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(rateLimited("60"));
    await expect(mal.fetchTopAnimePage(1)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 60 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Paused: the next call doesn't reach MAL and says how long is left.
    vi.advanceTimersByTime(20_000);
    await expect(mal.fetchTopAnimePage(2)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 40 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // After the pause, MAL is asked again.
    vi.advanceTimersByTime(41_000);
    stubFetch(jsonResponse(rankingPage([malEntry()])));
    await expect(mal.fetchTopAnimePage(2)).resolves.toBeTruthy();
  });

  it("pauses briefly after a 5xx", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(new Response("", { status: 502 }));
    await expect(mal.fetchTopAnimePage(3, { attempts: 1 })).rejects.toMatchObject({ status: 502 });
    await expect(mal.fetchTopAnimePage(3, { attempts: 1 })).rejects.toMatchObject({ status: 502, retryAfterSeconds: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(16_000);
    stubFetch(jsonResponse(rankingPage([malEntry()])));
    await expect(mal.fetchTopAnimePage(3)).resolves.toBeTruthy();
  });

  it("retries network failures, then throws", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(new TypeError("fetch failed"), new TypeError("fetch failed"), new TypeError("fetch failed"));
    const pending = mal.fetchTopAnimePage(1).catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const err = await pending;
    expect(err).toBeInstanceOf(mal.MyAnimeListError);
    expect(String((err as Error).message)).toMatch(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aborts a body that stalls after the headers, like a network failure", async () => {
    vi.useFakeTimers();
    const stalled = (_url: string, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          new Promise((_, reject) =>
            init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
          ),
      });
    const fetchMock = vi.fn(stalled);
    vi.stubGlobal("fetch", fetchMock);
    const pending = mal.fetchTopAnimePage(1, { attempts: 1 }).catch((err: unknown) => err);
    await vi.advanceTimersByTimeAsync(7_000);
    const err = await pending;
    expect(err).toBeInstanceOf(mal.MyAnimeListError);
    expect(String((err as Error).message)).toMatch(/timed out/);
  });

  it("throws on a malformed body", async () => {
    stubFetch(jsonResponse({ status: "ok" }));
    await expect(mal.fetchTopAnimePage(1)).rejects.toBeInstanceOf(mal.MyAnimeListError);
  });
});
