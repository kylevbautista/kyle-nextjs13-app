import { describe, expect, it } from "vitest";
import { calendarDayMs, normalizeEntry, normalizeMedia, normalizeUserData } from "./normalize";
import { DEFAULT_USER_DATA } from "./types";

const aniListMedia = {
  id: 154587,
  idMal: 52991,
  title: { romaji: "Sousou no Frieren", english: "Frieren", native: "葬送のフリーレン" },
  description: "An elf mage.<br><i>(Source: Crunchyroll)</i>",
  coverImage: {
    extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587.jpg",
    large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587.jpg",
    medium: null,
    color: "#d6f1a1",
  },
  season: "FALL",
  seasonYear: 2023,
  format: "TV",
  status: "FINISHED",
  episodes: 28,
  duration: 24,
  source: "MANGA",
  genres: ["Adventure", "Drama", "Fantasy"],
  averageScore: 90,
  studios: { nodes: [{ name: "MADHOUSE" }] },
  startDate: { year: 2023, month: 9, day: 29 },
  externalLinks: [{ id: 1, url: "https://www.crunchyroll.com/series/GG5H5XQX4", site: "Crunchyroll" }],
  upcomingEpisode: null,
  upComingAirDate: { episode: [] },
  firstEpisode: { episode: [{ airingAt: 1695992400, episode: 1 }] },
};

describe("normalizeMedia", () => {
  it("round-trips a real AniList media object", () => {
    const media = normalizeMedia(aniListMedia);
    expect(media).toMatchObject({
      id: 154587,
      idMal: 52991,
      title: aniListMedia.title,
      description: "An elf mage.<br><i>(Source: Crunchyroll)</i>",
      coverImage: aniListMedia.coverImage,
      episodes: 28,
      genres: ["Adventure", "Drama", "Fantasy"],
      studios: { nodes: [{ name: "MADHOUSE" }] },
      firstEpisode: { episode: [{ airingAt: 1695992400, episode: 1 }] },
      upcomingEpisode: null,
    });
  });

  it("requires a positive integer id", () => {
    expect(normalizeMedia({ ...aniListMedia, id: "abc" })).toBeNull();
    expect(normalizeMedia({ ...aniListMedia, id: { $gt: 0 } })).toBeNull();
    expect(normalizeMedia({ ...aniListMedia, id: -3 })).toBeNull();
    expect(normalizeMedia(null)).toBeNull();
    expect(normalizeMedia({ ...aniListMedia, id: "21" })?.id).toBe(21);
  });

  it("drops unknown fields and neutralizes hostile values", () => {
    const media = normalizeMedia({
      ...aniListMedia,
      userData: { listType: "completed" },
      $where: "sleep(1000)",
      description: '<img src=x onerror="alert(document.cookie)">',
      coverImage: { extraLarge: "https://evil.example/pixel.gif", color: "red;background:url(x)" },
      externalLinks: [{ url: "javascript:alert(1)", site: "Crunchyroll" }],
      genres: ["Action", { $ne: 1 }, 5],
    })!;
    expect(media).not.toHaveProperty("userData");
    expect(media).not.toHaveProperty("$where");
    expect(media.description).toBeNull();
    expect(media.coverImage.extraLarge).toBeNull();
    expect(media.coverImage.color).toBeNull();
    expect(media.externalLinks[0].url).toBeNull();
    expect(media.genres).toEqual(["Action"]);
  });
});

describe("normalizeMedia date bounds", () => {
  it("drops timestamps and dates that would make Date formatting throw", () => {
    const media = normalizeMedia({
      ...aniListMedia,
      upComingAirDate: { episode: [{ airingAt: 9e15, episode: 2 }] },
      firstEpisode: { episode: [{ airingAt: -1e12, episode: 1 }] },
      startDate: { year: 99999, month: 13, day: 0 },
    })!;
    expect(media.upComingAirDate.episode[0].airingAt).toBeNull();
    expect(media.firstEpisode.episode[0].airingAt).toBeNull();
    expect(media.startDate).toEqual({ year: null, month: null, day: null });
  });
});

describe("normalizeEntry", () => {
  it("fills userData defaults for legacy entries", () => {
    expect(normalizeEntry(aniListMedia)?.userData).toEqual(DEFAULT_USER_DATA);
    expect(
      normalizeEntry({ ...aniListMedia, userData: { listType: "nonsense", episodeProgressNumber: -4 } })
        ?.userData
    ).toEqual(DEFAULT_USER_DATA);
  });
});

describe("normalizeUserData", () => {
  const now = Date.UTC(2026, 8, 27);
  const previous = { ...DEFAULT_USER_DATA };

  it("validates status, progress, score and dates", () => {
    const bad = (userData: unknown) =>
      normalizeUserData(userData, { episodes: 12, previous, now }).ok;
    expect(bad("x")).toBe(false);
    expect(bad({ listType: "binging" })).toBe(false);
    expect(bad({ episodeProgressNumber: -1 })).toBe(false);
    expect(bad({ episodeProgressNumber: 1.5 })).toBe(false);
    expect(bad({ score: 11 })).toBe(false);
    expect(bad({ startDate: "yesterday" })).toBe(false);
  });

  it("allows progress on shows with an unknown episode count", () => {
    const result = normalizeUserData({ episodeProgressNumber: 1105 }, { episodes: null, previous, now });
    expect(result).toEqual({
      ok: true,
      value: { ...previous, episodeProgressNumber: 1105, startDate: calendarDayMs(now) },
    });
  });

  it("clamps progress and auto-completes at the final episode", () => {
    const result = normalizeUserData({ episodeProgressNumber: 40 }, { episodes: 12, previous, now });
    expect(result.ok && result.value).toMatchObject({
      listType: "completed",
      episodeProgressNumber: 12,
      startDate: calendarDayMs(now),
      finishDate: calendarDayMs(now),
    });
  });

  it("fills progress when marked completed, but respects explicit dropped/paused", () => {
    const completed = normalizeUserData({ listType: "completed" }, { episodes: 24, previous, now });
    expect(completed.ok && completed.value.episodeProgressNumber).toBe(24);

    const dropped = normalizeUserData(
      { listType: "dropped", episodeProgressNumber: 24 },
      { episodes: 24, previous, now }
    );
    expect(dropped.ok && dropped.value.listType).toBe("dropped");
  });

  it("respects an explicit move back from Completed (rewatch)", () => {
    const done = { ...previous, listType: "completed" as const, episodeProgressNumber: 12 };
    const rewatch = normalizeUserData(
      { listType: "watching", episodeProgressNumber: 12 },
      { episodes: 12, previous: done, now }
    );
    expect(rewatch.ok && rewatch.value.listType).toBe("watching");
    const plan = normalizeUserData(
      { listType: "planning", episodeProgressNumber: 12 },
      { episodes: 12, previous: done, now }
    );
    expect(plan.ok && plan.value.listType).toBe("planning");
  });

  it("auto-fills dates with the Pacific calendar day", () => {
    // 6 PM PDT on Sep 30 is already Oct 1 in UTC.
    const evening = Date.UTC(2026, 9, 1, 1, 0);
    expect(calendarDayMs(evening)).toBe(Date.UTC(2026, 8, 30));
    const result = normalizeUserData({ episodeProgressNumber: 1 }, { episodes: 12, previous, now: evening });
    expect(result.ok && result.value.startDate).toBe(Date.UTC(2026, 8, 30));
  });

  it("rounds score to one decimal and allows clearing it", () => {
    const scored = normalizeUserData({ score: "8.46" }, { episodes: 12, previous, now });
    expect(scored.ok && scored.value.score).toBe(8.5);
    const cleared = normalizeUserData(
      { score: null },
      { episodes: 12, previous: { ...previous, score: 7 }, now }
    );
    expect(cleared.ok && cleared.value.score).toBeNull();
  });

  it("keeps existing values for fields that were not sent", () => {
    const prev = { ...previous, listType: "paused" as const, episodeProgressNumber: 3, score: 6 };
    const result = normalizeUserData({}, { episodes: 12, previous: prev, now });
    expect(result).toEqual({ ok: true, value: prev });
  });
});
