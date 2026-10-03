import { describe, expect, it } from "vitest";
import {
  MAL_RANKING_FIELDS,
  MAX_TOP_ANIME_PAGE,
  dedupeByMalId,
  mediaTypeLabel,
  parseTopAnimePage,
  readTopAnimePage,
  toTopAnimeItem,
  toTopAnimePage,
  type TopAnimeItem,
} from "./topAnime";

// Trimmed from a real api.myanimelist.net/v2/anime/ranking entry (Oct 2026).
const malEntry = (node: Record<string, unknown> = {}, rank: unknown = 1) => ({
  node: {
    id: 52991,
    title: "Sousou no Frieren",
    rank: 1,
    rating: "pg_13",
    main_picture: {
      medium: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
      large: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
    },
    alternative_titles: { synonyms: ["Frieren at the Funeral"], en: "Frieren: Beyond Journey's End", ja: "葬送のフリーレン" },
    mean: 9.25,
    num_list_users: 1524761,
    media_type: "tv",
    num_episodes: 28,
    start_season: { year: 2023, season: "fall" },
    start_date: "2023-09-29",
    ...node,
  },
  ranking: { rank },
});

describe("toTopAnimeItem", () => {
  it("keeps only the fields the page renders", () => {
    expect(toTopAnimeItem(malEntry())).toEqual({
      malId: 52991,
      rank: 1,
      title: "Sousou no Frieren",
      titleEnglish: "Frieren: Beyond Journey's End",
      score: 9.25,
      imageUrl: "https://cdn.myanimelist.net/images/anime/1015/138006.webp",
      type: "TV",
      episodes: 28,
      year: 2023,
      members: 1524761,
    });
  });

  it("uses the ranking's position, not the show's rank field (which can lag by one)", () => {
    expect(toTopAnimeItem(malEntry({ rank: 209 }, 208))?.rank).toBe(208);
  });

  it("falls back for missing fields instead of inventing values", () => {
    const item = toTopAnimeItem(
      malEntry({
        alternative_titles: { en: "", ja: "x" },
        main_picture: { large: "https://img.example.test/a.jpg" },
        start_season: undefined,
        start_date: "2003",
        num_episodes: 0,
        mean: undefined,
        num_list_users: undefined,
        media_type: "unknown",
      }, null)
    );
    expect(item).toMatchObject({
      titleEnglish: null,
      imageUrl: "https://img.example.test/a.jpg", // only MAL's own CDN is switched to WebP
      year: 2003, // from start_date
      episodes: null, // MAL's 0 = not known yet
      score: null,
      members: null,
      type: null,
      rank: null,
    });
  });

  it("reads the year from a full or partial start date", () => {
    expect(toTopAnimeItem(malEntry({ start_season: undefined, start_date: "1998-04-03" }))?.year).toBe(1998);
    expect(toTopAnimeItem(malEntry({ start_season: undefined, start_date: "1998-04" }))?.year).toBe(1998);
    expect(toTopAnimeItem(malEntry({ start_season: undefined, start_date: "soon" }))?.year).toBeNull();
  });

  it("rejects entries without a usable id and non-https images", () => {
    expect(toTopAnimeItem({ node: { title: "No id" } })).toBeNull();
    expect(toTopAnimeItem({ title: "Not an entry" })).toBeNull();
    expect(toTopAnimeItem(null)).toBeNull();
    expect(toTopAnimeItem(malEntry({ main_picture: { medium: "javascript:alert(1)" } }))?.imageUrl).toBeNull();
  });

  it("names a show with no title by its id", () => {
    expect(toTopAnimeItem(malEntry({ title: " ", alternative_titles: {} }))?.title).toBe("MyAnimeList #52991");
  });
});

describe("covers", () => {
  it("uses the WebP twin of MAL's JPEG covers and leaves other URLs alone", () => {
    const image = (main_picture: unknown) => toTopAnimeItem(malEntry({ main_picture }))?.imageUrl;
    expect(image({ medium: "https://cdn.myanimelist.net/images/anime/3/88469.jpg" })).toBe(
      "https://cdn.myanimelist.net/images/anime/3/88469.webp"
    );
    expect(image({ medium: "https://cdn.myanimelist.net/images/anime/3/88469.webp" })).toBe(
      "https://cdn.myanimelist.net/images/anime/3/88469.webp"
    );
    expect(image({ medium: "https://cdn.myanimelist.net/r/100x140/images/a.jpg?s=1" })).toBe(
      "https://cdn.myanimelist.net/r/100x140/images/a.jpg?s=1"
    );
    expect(image(undefined)).toBeNull();
  });
});

describe("mediaTypeLabel", () => {
  it("maps MAL's media types to the page's labels", () => {
    expect(["tv", "tv_special", "movie", "ova", "ona", "special", "music", "cm", "pv"].map(mediaTypeLabel)).toEqual([
      "TV",
      "TV Special",
      "Movie",
      "OVA",
      "ONA",
      "Special",
      "Music",
      "CM",
      "PV",
    ]);
    expect(mediaTypeLabel("unknown")).toBeNull();
    expect(mediaTypeLabel(undefined)).toBeNull();
  });
});

describe("toTopAnimePage", () => {
  it("returns a slim page, deduped and in rank order; paging.next means more", () => {
    const page = toTopAnimePage(
      {
        data: [malEntry({ id: 3 }, 31), malEntry({ id: 1 }, 29), malEntry({ id: 3 }, 31), malEntry({ id: 2 }, 30)],
        paging: { previous: "https://api.myanimelist.net/v2/anime/ranking?offset=0", next: "https://api.myanimelist.net/v2/anime/ranking?offset=50" },
      },
      2
    );
    expect(page?.items.map((item) => item.rank)).toEqual([29, 30, 31]);
    expect(page?.hasNextPage).toBe(true);
    expect(page?.currentPage).toBe(2);
  });

  it("has no next page when MAL sends no paging.next", () => {
    expect(toTopAnimePage({ data: [malEntry()], paging: { previous: "x" } }, 9)?.hasNextPage).toBe(false);
    expect(toTopAnimePage({ data: [] }, 9)?.hasNextPage).toBe(false);
  });

  it("ends the ranking at the first unranked entry, even mid-page", () => {
    // From about #22,900 MAL lists shows with no rank of their own ("N/A"), re-sorted by score.
    const page = toTopAnimePage(
      {
        data: [malEntry({ id: 1, rank: 22906 }, 22907), malEntry({ id: 2, rank: 22907 }, 22908), malEntry({ id: 3, rank: null }, 22909), malEntry({ id: 4, rank: null }, 22910)],
        paging: { next: "https://api.myanimelist.net/v2/anime/ranking?offset=22925" },
      },
      917
    );
    expect(page?.items.map((item) => item.malId)).toEqual([1, 2]);
    expect(page?.hasNextPage).toBe(false);
    expect(toTopAnimePage({ data: [malEntry({ rank: null })], paging: { next: "x" } }, 918)).toEqual({
      items: [],
      hasNextPage: false,
      currentPage: 918,
    });
  });

  it("leaves out Rx (adult) entries, like the rest of the site", () => {
    const page = toTopAnimePage(
      { data: [malEntry({ id: 1 }, 14919), malEntry({ id: 2, rating: "rx" }, 14920), malEntry({ id: 3, rating: "r+" }, 14921)], paging: { next: "x" } },
      597
    );
    expect(page?.items.map((item) => item.malId)).toEqual([1, 3]);
    expect(page?.hasNextPage).toBe(true);
  });

  it("asks MAL for the fields the end-of-ranking and adult checks need", () => {
    expect(MAL_RANKING_FIELDS.split(",")).toEqual(expect.arrayContaining(["rank", "rating", "num_list_users"]));
  });

  it("returns null for a body that isn't a ranking", () => {
    expect(toTopAnimePage({ error: "forbidden" }, 1)).toBeNull();
    expect(toTopAnimePage(null, 1)).toBeNull();
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

describe("parseTopAnimePage", () => {
  it("accepts whole pages from 1 to the bound", () => {
    expect(parseTopAnimePage("1")).toBe(1);
    expect(parseTopAnimePage("2")).toBe(2);
    expect(parseTopAnimePage(String(MAX_TOP_ANIME_PAGE))).toBe(MAX_TOP_ANIME_PAGE);
  });

  it("rejects everything else", () => {
    for (const value of [null, undefined, "", "0", "-1", "1.5", "2e3", " 2", "abc", String(MAX_TOP_ANIME_PAGE + 1), "99999"]) {
      expect(parseTopAnimePage(value)).toBeNull();
    }
  });
});

describe("readTopAnimePage", () => {
  const item = toTopAnimeItem(malEntry())!;

  it("reads /api/top-anime's body back", () => {
    expect(readTopAnimePage({ page: { items: [item], hasNextPage: true, currentPage: 2 } })).toEqual({
      items: [item],
      hasNextPage: true,
      currentPage: 2,
    });
  });

  it("drops malformed items and unsafe images", () => {
    const page = readTopAnimePage({
      page: { items: [{ title: "No id" }, { ...item, imageUrl: "http://x/y.jpg" }], hasNextPage: false, currentPage: 3 },
    });
    expect(page?.items).toHaveLength(1);
    expect(page?.items[0].imageUrl).toBeNull();
  });

  it("returns null for anything else", () => {
    expect(readTopAnimePage({ error: "upstream_error" })).toBeNull();
    expect(readTopAnimePage({ page: { items: [] } })).toBeNull();
    expect(readTopAnimePage("<html>")).toBeNull();
  });
});
