import { describe, expect, it } from "vitest";
import { normalizeMedia } from "./normalize";
import {
  ANILIST_FORMATS,
  FORMAT_KEYS,
  canonicalFormats,
  chipFormats,
  filterByFormat,
  formatCounts,
  formatKeyOf,
  hiddenWithShows,
  toggleFormat,
} from "./seasonFormats";
import { selectContinuing } from "./seasonOrder";
import type { AnimeMedia } from "./types";

const show = (id: number, format: string | null, popularity = 100): AnimeMedia => {
  const item = normalizeMedia({ id, title: { romaji: `Show ${id}` }, format, popularity });
  if (!item) throw new Error("bad fixture");
  return item;
};

describe("formatKeyOf", () => {
  it("keeps AniList's anime formats and buckets the rest as OTHER", () => {
    for (const key of ANILIST_FORMATS) expect(formatKeyOf({ format: key })).toBe(key);
    expect(formatKeyOf({ format: null })).toBe("OTHER");
    expect(formatKeyOf({ format: "MANGA" })).toBe("OTHER");
    expect(formatKeyOf({ format: "SOMETHING_NEW" })).toBe("OTHER");
  });
});

describe("formatCounts / chipFormats", () => {
  const media = [show(1, "TV"), show(2, "TV"), show(3, "ONA"), show(4, null)];

  it("counts every format, zeros included", () => {
    expect(formatCounts(media)).toEqual({ TV: 2, TV_SHORT: 0, MOVIE: 0, SPECIAL: 0, OVA: 0, ONA: 1, MUSIC: 0, OTHER: 1 });
  });

  it("always offers AniList's seven formats, in its order, and Other only when needed", () => {
    expect(chipFormats(formatCounts(media.slice(0, 3)), [])).toEqual(["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"]);
    expect(chipFormats(formatCounts(media), [])).toEqual([...FORMAT_KEYS]);
    // Hidden in another season: still offered, so it can be shown again.
    expect(chipFormats(formatCounts([]), ["OTHER"])).toEqual([...FORMAT_KEYS]);
  });
});

describe("filterByFormat / toggleFormat / canonicalFormats", () => {
  const media = [show(1, "TV"), show(2, "ONA"), show(3, "TV_SHORT"), show(4, "TV")];

  it("drops shows in hidden formats, keeping order; the same array when nothing is hidden", () => {
    expect(filterByFormat(media, []).map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(filterByFormat(media, [])).toBe(media);
    expect(filterByFormat(media, ["ONA", "TV_SHORT"]).map((m) => m.id)).toEqual([1, 4]);
    expect(filterByFormat(media, ["TV"]).map((m) => m.id)).toEqual([2, 3]);
  });

  it("keeps hidden sets in one order, so equal sets are equal strings", () => {
    expect(toggleFormat([], "ONA")).toEqual(["ONA"]);
    expect(toggleFormat(["ONA"], "TV")).toEqual(["TV", "ONA"]);
    expect(toggleFormat(["TV", "ONA"], "TV")).toEqual(["ONA"]);
    expect(canonicalFormats(["OTHER", "MOVIE", "TV", "MOVIE"])).toEqual(["TV", "MOVIE", "OTHER"]);
    expect(toggleFormat(toggleFormat([], "MUSIC"), "TV").join(",")).toBe(toggleFormat(toggleFormat([], "TV"), "MUSIC").join(","));
  });

  it("names the hidden formats that hold shows, in chip order", () => {
    expect(hiddenWithShows(formatCounts(media), ["ONA", "MUSIC", "TV_SHORT"])).toEqual(["TV_SHORT", "ONA"]);
    expect(hiddenWithShows(formatCounts(media), [])).toEqual([]);
  });
});

describe("the format filter and continuing series", () => {
  it("never moves the popularity floor: continuing series are chosen from every loaded show, then filtered", () => {
    // Page 1 so far: two popular TV shows and an unpopular TV short.
    const media = [show(1, "TV", 900), show(2, "TV", 800), show(3, "TV_SHORT", 50)];
    const carryOver = [show(10, "TV", 120), show(11, "TV", 40)];
    const all = selectContinuing({ carryOver, media, showContinuing: true, sort: "popularity", hasNextPage: true });
    // Floor 50 (the TV short): the 120 one is in, the 40 one waits for later pages.
    expect(all.map((m) => m.id)).toEqual([10]);
    // Hiding TV Short filters the result; it doesn't recompute the floor from the TV shows (800).
    expect(filterByFormat(all, ["TV_SHORT"]).map((m) => m.id)).toEqual([10]);
    // Hiding TV hides them all (they're TV series).
    expect(filterByFormat(all, ["TV"])).toEqual([]);
  });
});
