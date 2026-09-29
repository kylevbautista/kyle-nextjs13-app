import { describe, expect, it } from "vitest";
import { normalizeMedia } from "./anime/normalize";
import type { AnimeMedia } from "./anime/types";
import {
  ADD_INTENT_TTL_MS,
  AIRED_GRACE_SECONDS,
  RIMURU_CHARACTER_URL,
  TEMPEST_FALLBACK,
  addIntentCallbackUrl,
  buildSeasonMeta,
  defaultScheduleDay,
  evolutionTier,
  firstName,
  formatCountdownMinutes,
  formatLabel,
  formatWeekdayTime,
  groupByWeekday,
  nextTier,
  parseAddIntent,
  parseLandingExtras,
  pickAiringCandidates,
  seasonLabel,
  seasonShowCount,
  serializeAddIntent,
  showsLabel,
  sortTempest,
  tempestFromExtras,
  toTempestEntry,
  visibleAiring,
  type TempestEntry,
} from "./landing";

// Tue Sep 29 2026 12:00 UTC (05:00 PDT).
const NOW_MS = Date.UTC(2026, 8, 29, 12, 0);
const NOW_S = NOW_MS / 1000;
const HOUR = 3600;
const DAY = 86_400;

const media = (
  id: number,
  {
    airingAt = null,
    episode = 5,
    popularity = 1000,
    extra = {},
  }: { airingAt?: number | null; episode?: number; popularity?: number; extra?: object } = {}
): AnimeMedia => {
  const item = normalizeMedia({
    id,
    title: { romaji: `Show ${id}`, english: null, native: null },
    popularity,
    upComingAirDate: { episode: airingAt ? [{ airingAt, episode }] : [] },
    ...extra,
  });
  if (!item) throw new Error("bad fixture");
  return item;
};

const ids = (list: AnimeMedia[]) => list.map((item) => item.id);

describe("pickAiringCandidates", () => {
  const opts = { windowDays: 7 };

  it("dedupes by id, and the season's own entry wins over the carry-over", () => {
    const season = [media(1, { airingAt: NOW_S + HOUR })];
    const carry = [media(1, { airingAt: NOW_S + HOUR }), media(2, { airingAt: NOW_S + 2 * HOUR })];
    expect(pickAiringCandidates(season, carry, NOW_MS, opts)).toEqual({
      ids: [1, 2],
      continuingIds: [2],
    });
  });

  it("keeps next episodes within [now − 30 min, now + windowDays]", () => {
    const list = [
      media(1, { airingAt: NOW_S - AIRED_GRACE_SECONDS }), // edge: kept
      media(2, { airingAt: NOW_S - AIRED_GRACE_SECONDS - 1 }), // too old
      media(3, { airingAt: NOW_S + 7 * DAY }), // edge: kept
      media(4, { airingAt: NOW_S + 7 * DAY + 1 }), // too far
      media(5), // nothing scheduled
    ];
    expect(pickAiringCandidates(list, [], NOW_MS, opts).ids).toEqual([1, 3]);
    expect(pickAiringCandidates(list, [], NOW_MS, { windowDays: 16 }).ids).toEqual([1, 3, 4]);
  });

  it("takes the most popular pool, then orders it soonest first and applies the limit", () => {
    const list = [
      media(1, { airingAt: NOW_S + 5 * HOUR, popularity: 500 }),
      media(2, { airingAt: NOW_S + 1 * HOUR, popularity: 10 }), // soonest but least popular
      media(3, { airingAt: NOW_S + 3 * HOUR, popularity: 900 }),
      media(4, { airingAt: NOW_S + 4 * HOUR, popularity: 700 }),
    ];
    expect(pickAiringCandidates(list, [], NOW_MS, { windowDays: 7, pool: 3 }).ids).toEqual([
      3, 4, 1,
    ]);
    expect(
      pickAiringCandidates(list, [], NOW_MS, { windowDays: 7, pool: 3, limit: 2 }).ids
    ).toEqual([3, 4]);
  });

  it("defaults to a pool of 30 and a limit of 12, with ties kept in popularity order", () => {
    const list = Array.from({ length: 40 }, (_, index) =>
      media(index + 1, { airingAt: NOW_S + HOUR, popularity: 1000 - index })
    );
    const { ids: picked } = pickAiringCandidates(list, [], NOW_MS, opts);
    expect(picked).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });

  it("reports only carry-over shows as continuing", () => {
    const season = [media(1, { airingAt: NOW_S + HOUR })];
    const carry = [media(9, { airingAt: NOW_S + 2 * HOUR }), media(8, { airingAt: NOW_S + 30 * DAY })];
    expect(pickAiringCandidates(season, carry, NOW_MS, opts)).toEqual({
      ids: [1, 9],
      continuingIds: [9],
    });
  });
});

describe("visibleAiring", () => {
  const list = [
    media(1, { airingAt: NOW_S - 2 * HOUR }), // aired long ago
    media(2, { airingAt: NOW_S - AIRED_GRACE_SECONDS }), // just within the grace period
    media(3, { airingAt: NOW_S + HOUR }),
    media(4, { airingAt: NOW_S + 2 * HOUR }),
    media(5, { airingAt: NOW_S + 3 * HOUR }),
  ];

  it("keeps the order and backfills past aired shows so the count holds", () => {
    expect(ids(visibleAiring(list, NOW_MS, 3))).toEqual([2, 3, 4]);
    expect(ids(visibleAiring(list, NOW_MS + 60_000, 3))).toEqual([3, 4, 5]);
  });

  it("applies the exclusion and runs short only when candidates run out", () => {
    expect(ids(visibleAiring(list, NOW_MS, 3, (id) => id === 3))).toEqual([2, 4, 5]);
    expect(ids(visibleAiring(list, NOW_MS + 10 * HOUR * 1000, 3))).toEqual([]);
  });
});

describe("seasonShowCount", () => {
  it("prefers the exact count from the id pages", () => {
    expect(seasonShowCount({ exact: { count: 74, capped: false }, pageOneCount: 50, hasNextPage: true })).toBe("74");
    expect(seasonShowCount({ exact: { count: 150, capped: true }, pageOneCount: 50, hasNextPage: true })).toBe("150+");
  });
  it("falls back to page 1", () => {
    expect(seasonShowCount({ exact: null, pageOneCount: 50, hasNextPage: true })).toBe("50+");
    expect(seasonShowCount({ exact: null, pageOneCount: 12, hasNextPage: false })).toBe("12");
  });
});

describe("buildSeasonMeta", () => {
  const counts = { showCount: "74", continuingCount: 31 };
  it("links the explicit season in preview mode", () => {
    expect(
      buildSeasonMeta({ year: 2026, season: "fall", preview: true, startsAtMs: Date.UTC(2026, 9, 1) }, counts)
    ).toEqual({
      year: 2026,
      season: "fall",
      label: "Fall 2026",
      preview: true,
      startsLabel: "October 1",
      seasonHref: "/anime/2026/fall",
      browseHref: "/anime/2026/fall",
      browseLabel: "Preview Fall 2026",
      showCount: "74",
      continuingCount: 31,
    });
  });
  it("links /anime in season", () => {
    expect(
      buildSeasonMeta({ year: 2026, season: "fall", preview: false, startsAtMs: Date.UTC(2026, 9, 1) }, counts)
    ).toMatchObject({ browseHref: "/anime", browseLabel: "Browse this season" });
  });
});

// A live-shaped extras response (trimmed from the 2026-09-29 check).
const tempestMedia = (
  id: number,
  { banner = null, year = 2018, month = 10, day = 2 as number | null, status = "FINISHED" } = {} as {
    banner?: string | null;
    year?: number | null;
    month?: number | null;
    day?: number | null;
    status?: string;
  }
) => ({
  id,
  title: { romaji: `Tensei Shitara Slime ${id}`, english: id === 217330 ? null : `Slime ${id}`, native: null },
  format: "TV",
  status,
  episodes: status === "FINISHED" ? 24 : null,
  season: "FALL",
  seasonYear: year,
  startDate: { year, month, day },
  bannerImage: banner,
  coverImage: {
    large: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx${id}.jpg`,
    medium: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx${id}.jpg`,
    color: "#5daef1",
  },
});

const liveExtras = () => ({
  data: {
    tempest: {
      media: [
        tempestMedia(101280, { banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101280.jpg" }),
        tempestMedia(156822, {
          banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/156822.jpg",
          year: 2024,
          month: 4,
          day: 5,
        }),
        tempestMedia(217330, { year: 2027, month: 4, day: null, status: "NOT_YET_RELEASED" }),
      ],
    },
    mascot: {
      characters: [
        {
          id: 123962,
          name: { full: "Rimuru Tempest", native: "リムル・テンペスト" },
          image: { large: "https://s4.anilist.co/file/anilistcdn/character/large/b123962-eL9yGV0NLMF7.png" },
          siteUrl: "https://anilist.co/character/123962",
        },
      ],
    },
    count1: { pageInfo: { hasNextPage: true }, media: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })) },
    count2: { pageInfo: { hasNextPage: false }, media: Array.from({ length: 24 }, (_, i) => ({ id: i + 51 })) },
    count3: { pageInfo: { hasNextPage: false }, media: [] as { id: number }[] },
  },
});

describe("parseLandingExtras", () => {
  it("parses a live-shaped response", () => {
    const extras = parseLandingExtras(liveExtras());
    expect(extras?.seasonCount).toEqual({ count: 74, capped: false });
    expect(extras?.tempest?.media.map((m) => m.id)).toEqual([101280, 156822, 217330]);
    expect(extras?.tempest?.bannerUrl).toBe("https://s4.anilist.co/file/anilistcdn/media/anime/banner/101280.jpg");
    expect(extras?.tempest?.portraitUrl).toBe(
      "https://s4.anilist.co/file/anilistcdn/character/large/b123962-eL9yGV0NLMF7.png"
    );
    expect(extras?.tempest?.characterUrl).toBe("https://anilist.co/character/123962");
  });

  it("rejects banners and portraits from other hosts and falls through the banner preference", () => {
    const json = liveExtras();
    json.data.tempest.media[0].bannerImage = "https://evil.example/banner.jpg";
    json.data.mascot.characters[0].image.large = "http://s4.anilist.co/insecure.png";
    const extras = parseLandingExtras(json);
    expect(extras?.tempest?.bannerUrl).toBe("https://s4.anilist.co/file/anilistcdn/media/anime/banner/156822.jpg");
    expect(extras?.tempest?.portraitUrl).toBeNull();
  });

  it("survives a missing character", () => {
    const json = liveExtras() as { data: Record<string, unknown> };
    json.data.mascot = { characters: [] };
    const extras = parseLandingExtras(json);
    expect(extras?.tempest?.portraitUrl).toBeNull();
    expect(extras?.tempest?.characterUrl).toBe(RIMURU_CHARACTER_URL);
    expect(extras?.tempest?.media).toHaveLength(3);
  });

  it("marks the count as capped when page 3 has more", () => {
    const json = liveExtras();
    json.data.count2.pageInfo.hasNextPage = true;
    json.data.count2.media = Array.from({ length: 50 }, (_, i) => ({ id: i + 51 }));
    json.data.count3 = {
      pageInfo: { hasNextPage: true },
      media: Array.from({ length: 50 }, (_, i) => ({ id: i + 101 })),
    };
    expect(parseLandingExtras(json)?.seasonCount).toEqual({ count: 150, capped: true });
  });

  it("nulls only the parts that are missing", () => {
    const json = liveExtras() as { data: Record<string, unknown> };
    json.data.tempest = null;
    json.data.count2 = null; // needed, because count1 has a next page
    expect(parseLandingExtras(json)).toEqual({ tempest: null, seasonCount: null });

    const partial = liveExtras() as { data: Record<string, unknown> };
    partial.data.count1 = { pageInfo: { hasNextPage: false }, media: [{ id: 1 }, { id: 1 }, { id: "x" }] };
    partial.data.count2 = null; // not needed
    expect(parseLandingExtras(partial)?.seasonCount).toEqual({ count: 1, capped: false });
  });

  it("returns null without a data object", () => {
    expect(parseLandingExtras(null)).toBeNull();
    expect(parseLandingExtras({ errors: [{ message: "boom" }] })).toBeNull();
    expect(parseLandingExtras("nope")).toBeNull();
  });

  it("ignores media outside the franchise and duplicates", () => {
    const json = liveExtras();
    json.data.tempest.media.push(tempestMedia(1), tempestMedia(101280));
    expect(parseLandingExtras(json)?.tempest?.media.map((m) => m.id)).toEqual([101280, 156822, 217330]);
  });
});

describe("Tempest entries", () => {
  it("builds shelf entries with short labels and upcoming flags", () => {
    const extras = parseLandingExtras(liveExtras());
    const tempest = tempestFromExtras(extras);
    expect(tempest.live).toBe(true);
    expect(tempest.entries.map((e) => e.shortLabel)).toEqual(["Season 1", "Season 3", "Clayman REVENGE"]);
    expect(tempest.entries[2]).toMatchObject({
      upcoming: true,
      fullTitle: "Tensei Shitara Slime 217330",
      seasonLabel: "Fall 2027",
      episodes: null,
      coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx217330.jpg",
    });
  });

  it("falls back to the static list", () => {
    expect(tempestFromExtras(null)).toEqual({
      live: false,
      entries: TEMPEST_FALLBACK,
      bannerUrl: null,
      portraitUrl: null,
      characterUrl: RIMURU_CHARACTER_URL,
    });
    expect(tempestFromExtras({ tempest: null, seasonCount: null }).live).toBe(false);
    expect(TEMPEST_FALLBACK).toHaveLength(9);
    expect(sortTempest(TEMPEST_FALLBACK)).toEqual(TEMPEST_FALLBACK);
  });

  it("sorts by start date with unknown dates last", () => {
    const entry = (id: number, extra: object) => toTempestEntry(media(id, { extra }));
    const unknown = entry(1, { startDate: { year: null } });
    const yearOnly = entry(2, { startDate: { year: 2027 } });
    const april = entry(3, { startDate: { year: 2027, month: 4 } });
    const early = entry(4, { startDate: { year: 2018, month: 10, day: 2 } });
    const sorted: TempestEntry[] = sortTempest([unknown, yearOnly, april, early]);
    expect(sorted.map((e) => e.id)).toEqual([4, 3, 2, 1]);
  });
});

describe("evolution", () => {
  it("names the slime on sign-in and evolves at 3 and 10 shows", () => {
    expect(evolutionTier(false, 25)).toBe("slime");
    expect(evolutionTier(true, null)).toBe("named");
    expect([0, 1, 2, 3, 9, 10].map((count) => evolutionTier(true, count))).toEqual([
      "named",
      "named",
      "named",
      "demon",
      "demon",
      "lord",
    ]);
  });

  it("knows the next tier and its threshold", () => {
    expect(nextTier("slime")).toEqual({ tier: "named", at: 0 });
    expect(nextTier("named")).toEqual({ tier: "demon", at: 3 });
    expect(nextTier("demon")).toEqual({ tier: "lord", at: 10 });
    expect(nextTier("lord")).toBeNull();
  });
});

describe("firstName / showsLabel", () => {
  it("takes the first token, capped at 24 characters", () => {
    expect(firstName("  Kyle Bautista ")).toBe("Kyle");
    expect(firstName("Wolfeschlegelsteinhausenbergerdorff")).toBe("Wolfeschlegelsteinhausen");
  });
  it("is null for empty names", () => {
    expect(firstName("")).toBeNull();
    expect(firstName("   ")).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
  });
  it("pluralizes", () => {
    expect(showsLabel(1)).toBe("1 show");
    expect(showsLabel(12)).toBe("12 shows");
  });
});

describe("labels", () => {
  it("formats weekday times in Pacific Time with plain spaces", () => {
    const label = formatWeekdayTime(Date.UTC(2026, 8, 30, 16, 30) / 1000);
    expect(label).toBe("Wed 9:30 AM");
    expect(label).not.toMatch(/[  ]/);
  });
  it("formats per-minute countdowns", () => {
    expect(formatCountdownMinutes(DAY + 4 * HOUR + 12 * 60 + 59)).toBe("1d 4h 12m");
    expect(formatCountdownMinutes(2 * HOUR + 14 * 60)).toBe("2h 14m");
  });
  it("formats AniList formats", () => {
    expect(["TV", "MOVIE", "OVA", "SPECIAL", "ONA", "TV_SHORT"].map(formatLabel)).toEqual([
      "TV",
      "Movie",
      "OVA",
      "Special",
      "ONA",
      "TV Short",
    ]);
    expect(formatLabel("MUSIC")).toBeNull();
    expect(formatLabel(null)).toBeNull();
  });
  it("formats seasons", () => {
    expect(seasonLabel("FALL", 2018)).toBe("Fall 2018");
    expect(seasonLabel("spring", 2027)).toBe("Spring 2027");
    expect(seasonLabel(null, 2027)).toBe("2027");
    expect(seasonLabel("FALL", null)).toBeNull();
  });
});

describe("schedule preview", () => {
  // Mon Sep 28 2026 19:00 PDT; Wed Sep 30 2026 09:30 PDT; Sat Oct 3 2026 08:00 PDT.
  const MON = Date.UTC(2026, 8, 29, 2, 0) / 1000;
  const WED = Date.UTC(2026, 8, 30, 16, 30) / 1000;
  const SAT = Date.UTC(2026, 9, 3, 15, 0) / 1000;

  it("groups by Pacific weekday in schedule order, soonest first", () => {
    const later = media(1, { airingAt: WED + 7 * DAY });
    const sooner = media(2, { airingAt: WED });
    const monday = media(3, { airingAt: MON });
    const groups = groupByWeekday([later, sooner, monday, media(4)]);
    expect(Object.keys(groups)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
    expect(ids(groups.wednesday)).toEqual([2, 1]);
    expect(ids(groups.monday)).toEqual([3]);
    expect(groups.tuesday).toEqual([]);
  });

  it("defaults to today, else the next day with shows, wrapping around the week", () => {
    const groups = groupByWeekday([media(1, { airingAt: MON }), media(2, { airingAt: WED })]);
    expect(defaultScheduleDay(groups, "wednesday")).toBe("wednesday");
    expect(defaultScheduleDay(groups, "tuesday")).toBe("wednesday");
    expect(defaultScheduleDay(groups, "thursday")).toBe("monday");
    expect(defaultScheduleDay(groupByWeekday([media(5, { airingAt: SAT })]), "sunday")).toBe("saturday");
    expect(defaultScheduleDay(groupByWeekday([]), "friday")).toBe("friday");
  });
});

describe("add intent", () => {
  const show = media(42, { airingAt: NOW_S + HOUR });
  const stored = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({ id: 42, status: "planning", at: NOW_MS, media: show, ...overrides });

  it("round-trips a fresh intent", () => {
    const raw = serializeAddIntent({ id: 42, status: "planning", at: NOW_MS, media: show });
    expect(parseAddIntent(raw, 42, NOW_MS + 60_000)).toEqual({
      id: 42,
      status: "planning",
      at: NOW_MS,
      media: show,
    });
    const noStatus = parseAddIntent(serializeAddIntent({ id: 42, at: NOW_MS, media: show }), 42, NOW_MS);
    expect(noStatus).toEqual({ id: 42, at: NOW_MS, media: show });
  });

  it("expires after 15 minutes", () => {
    expect(parseAddIntent(stored(), 42, NOW_MS + ADD_INTENT_TTL_MS)).not.toBeNull();
    expect(parseAddIntent(stored(), 42, NOW_MS + ADD_INTENT_TTL_MS + 1)).toBeNull();
    expect(parseAddIntent(stored({ at: NOW_MS + 10 * 60_000 }), 42, NOW_MS)).toBeNull();
  });

  it("rejects malformed JSON, a different id and a bad status", () => {
    expect(parseAddIntent(null, 42, NOW_MS)).toBeNull();
    expect(parseAddIntent("{nope", 42, NOW_MS)).toBeNull();
    expect(parseAddIntent("[]", 42, NOW_MS)).toBeNull();
    expect(parseAddIntent(stored(), 43, NOW_MS)).toBeNull();
    expect(parseAddIntent(stored({ status: "binging" }), 42, NOW_MS)).toBeNull();
    expect(parseAddIntent(stored({ at: "yesterday" }), 42, NOW_MS)).toBeNull();
    expect(parseAddIntent(stored({ media: { ...show, id: 7 } }), 42, NOW_MS)).toBeNull();
    expect(parseAddIntent(stored({ media: null }), 42, NOW_MS)).toBeNull();
  });

  it("re-normalizes the stored media", () => {
    const hostile = { ...show, description: "Hi<script>alert(1)</script>", coverImage: { large: "https://evil.example/x.jpg" } };
    const intent = parseAddIntent(stored({ media: hostile }), 42, NOW_MS);
    expect(intent?.media.description).toBe("Hi");
    expect(intent?.media.coverImage.large).toBeNull();
  });

  it("builds the OAuth callback URL", () => {
    expect(addIntentCallbackUrl(42)).toBe("/?add=42#quests");
    expect(addIntentCallbackUrl(42, "planning")).toBe("/?add=42&as=planning#quests");
  });
});
