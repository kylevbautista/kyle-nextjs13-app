import { afterEach, describe, expect, it, vi } from "vitest";
import {
  JikanError,
  dedupeByMalId,
  getTopAnimeJinkan,
  toTopAnimeItem,
  type TopAnimeItem,
} from "./getTopAnimeJinkan";

// Trimmed from a real https://api.jikan.moe/v4/top/anime item.
const jikanItem = (overrides: Record<string, unknown> = {}) => ({
  mal_id: 52991,
  url: "https://myanimelist.net/anime/52991/Sousou_no_Frieren",
  images: {
    jpg: {
      image_url: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
      large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
    },
    webp: {
      image_url: "https://cdn.myanimelist.net/images/anime/1015/138006.webp",
      large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138006l.webp",
    },
  },
  title: "Sousou no Frieren",
  title_english: "Frieren: Beyond Journey's End",
  title_japanese: "葬送のフリーレン",
  type: "TV",
  episodes: 28,
  aired: { prop: { from: { day: 29, month: 9, year: 2023 } } },
  score: 9.26,
  rank: 1,
  members: 1479110,
  synopsis: "During their decade-long quest…",
  year: 2023,
  ...overrides,
});

const jikanPage = (data: unknown[], pagination: Record<string, unknown> = {}) => ({
  pagination: { current_page: 1, has_next_page: true, last_visible_page: 1107, ...pagination },
  data,
});

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

// Retry-After: 0 keeps the retry path fast without fake timers.
const rateLimited = () =>
  new Response(JSON.stringify({ status: 429, type: "RateLimitException" }), {
    status: 429,
    headers: { "Retry-After": "0" },
  });

const stubFetch = (...responses: (Response | Error)[]) => {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("toTopAnimeItem", () => {
  it("keeps only the fields the page renders", () => {
    expect(toTopAnimeItem(jikanItem())).toEqual({
      malId: 52991,
      rank: 1,
      title: "Sousou no Frieren",
      titleEnglish: "Frieren: Beyond Journey's End",
      score: 9.26,
      imageUrl: "https://cdn.myanimelist.net/images/anime/1015/138006.webp",
      type: "TV",
      episodes: 28,
      year: 2023,
      members: 1479110,
    });
  });

  it("falls back for missing fields instead of inventing values", () => {
    const item = toTopAnimeItem(
      jikanItem({
        title_english: null,
        images: { jpg: { image_url: "https://cdn.myanimelist.net/a.jpg" } },
        year: null,
        episodes: null,
        score: null,
        rank: null,
      })
    );
    expect(item).toMatchObject({
      titleEnglish: null,
      imageUrl: "https://cdn.myanimelist.net/a.jpg",
      year: 2023, // from aired.prop.from.year
      episodes: null,
      score: null,
      rank: null,
    });
  });

  it("rejects entries without a usable id and non-https images", () => {
    expect(toTopAnimeItem({ title: "No id" })).toBeNull();
    expect(toTopAnimeItem(null)).toBeNull();
    expect(
      toTopAnimeItem(jikanItem({ images: { jpg: { image_url: "javascript:alert(1)" } } }))
        ?.imageUrl
    ).toBeNull();
  });
});

describe("dedupeByMalId", () => {
  const a = { malId: 1 } as TopAnimeItem;
  const b = { malId: 2 } as TopAnimeItem;

  it("appends only unseen shows", () => {
    expect(dedupeByMalId([a], [a, b, b])).toEqual([a, b]);
  });

  it("returns the same array when nothing is new", () => {
    const existing = [a, b];
    expect(dedupeByMalId(existing, [b, a])).toBe(existing);
  });
});

describe("getTopAnimeJinkan (server)", () => {
  it("returns a slim page, deduped and in rank order", async () => {
    const fetchMock = stubFetch(
      jsonResponse(
        jikanPage([
          jikanItem({ mal_id: 3, rank: 31 }),
          jikanItem({ mal_id: 1, rank: 29 }),
          jikanItem({ mal_id: 3, rank: 31 }),
          jikanItem({ mal_id: 2, rank: 30 }),
        ], { current_page: 2, has_next_page: false })
      )
    );
    const page = await getTopAnimeJinkan({ page: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/top\/anime\?page=2$/);
    expect(page.items.map((item) => item.rank)).toEqual([29, 30, 31]);
    expect(page.hasNextPage).toBe(false);
    expect(page.currentPage).toBe(2);
  });

  it("retries a 429 and then succeeds", async () => {
    const fetchMock = stubFetch(rateLimited(), jsonResponse(jikanPage([jikanItem()])));
    const page = await getTopAnimeJinkan({ page: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(1);
  });

  it("throws after the last attempt so ISR keeps the previous page", async () => {
    const fetchMock = stubFetch(rateLimited(), rateLimited(), rateLimited());
    await expect(getTopAnimeJinkan({ page: 1 })).rejects.toMatchObject({
      name: "JikanError",
      status: 429,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry client errors", async () => {
    const fetchMock = stubFetch(new Response("nope", { status: 404 }));
    await expect(getTopAnimeJinkan({ page: 1 })).rejects.toBeInstanceOf(JikanError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not wait out a long Retry-After", async () => {
    const fetchMock = stubFetch(new Response("", { status: 429, headers: { "Retry-After": "60" } }));
    await expect(getTopAnimeJinkan({ page: 1 })).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on a malformed body", async () => {
    stubFetch(jsonResponse({ status: "ok" }));
    await expect(getTopAnimeJinkan({ page: 1 })).rejects.toBeInstanceOf(JikanError);
  });
});

describe("getTopAnimeJinkan (client)", () => {
  it("wraps success", async () => {
    stubFetch(jsonResponse(jikanPage([jikanItem()])));
    const result = await getTopAnimeJinkan({ page: 1, isClient: true });
    expect(result.ok).toBe(true);
  });

  it("resolves to a rate-limit failure instead of throwing", async () => {
    const fetchMock = stubFetch(rateLimited(), rateLimited());
    const result = await getTopAnimeJinkan({ page: 3, isClient: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: false, rateLimited: true });
  });

  it("resolves to a generic failure on network errors", async () => {
    vi.useFakeTimers();
    stubFetch(new TypeError("Failed to fetch"), new TypeError("Failed to fetch"));
    const pending = getTopAnimeJinkan({ page: 3, isClient: true });
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result).toMatchObject({ ok: false, rateLimited: false });
    if (!result.ok) expect(result.error).toMatch(/try again/i);
  });
});
