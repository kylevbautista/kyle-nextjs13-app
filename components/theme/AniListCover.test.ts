import { describe, expect, it } from "vitest";
import { anilistCoverWidth, anilistSrcSet } from "./AniListCover";

const url = (size: "small" | "medium" | "large", file = "bx1-a.jpg") =>
  `https://s4.anilist.co/file/anilistcdn/media/anime/cover/${size}/${file}`;

describe("AniList cover srcset", () => {
  it("reads AniList's real width from the URL path", () => {
    expect(anilistCoverWidth(url("small"))).toBe(100);
    expect(anilistCoverWidth(url("medium"))).toBe(230);
    expect(anilistCoverWidth(url("large"))).toBe(460);
    expect(anilistCoverWidth("https://cdn.myanimelist.net/images/anime/1/1.jpg")).toBeNull();
  });

  it("lists every size once, smallest first, whatever the field order", () => {
    expect(anilistSrcSet([url("large"), null, url("small"), url("medium")])).toBe(
      `${url("small")} 100w, ${url("medium")} 230w, ${url("large")} 460w`
    );
  });

  it("doesn't pretend a missing big upload is 460px wide", () => {
    // New shows: extraLarge points at the /medium/ file.
    expect(anilistSrcSet([url("small"), url("medium"), url("medium")])).toBe(
      `${url("small")} 100w, ${url("medium")} 230w`
    );
  });

  it("gives up on URLs it can't size", () => {
    expect(anilistSrcSet([null, undefined, "https://example.com/x.jpg"])).toBeNull();
  });
});
