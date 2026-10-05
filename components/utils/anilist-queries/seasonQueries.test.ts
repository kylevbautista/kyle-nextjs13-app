import { describe, expect, it } from "vitest";
import { SEASON_LIST_FILTER, allCurrAnimeTag } from "./allCurrAnimeTag";
import { landingExtrasQuery } from "./landingExtrasQuery";

/** The arguments of a root field's media(...) call, by the field's alias. */
function mediaArgs(query: string, alias: string): string {
  const start = query.indexOf(`${alias}: Page(`);
  if (start === -1) throw new Error(`no ${alias}`);
  const media = query.indexOf("media(", start);
  return query.slice(media, query.indexOf(")", media) + 1);
}

describe("the season list's filter", () => {
  it("is every anime format, adult titles excluded", () => {
    expect(SEASON_LIST_FILTER).toBe("type: ANIME, isAdult: false");
  });

  it("is the season page's, with no format exclusion; continuing series stay TV only", () => {
    const page = mediaArgs(allCurrAnimeTag, "page");
    expect(page).toContain(SEASON_LIST_FILTER);
    expect(page).not.toMatch(/format/);
    expect(page).toContain("sort: [POPULARITY_DESC, ID]");
    expect(mediaArgs(allCurrAnimeTag, "ended")).toContain("format_in: [TV]");
    expect(mediaArgs(allCurrAnimeTag, "airing")).toContain("format_in: [TV]");
  });

  it("is the landing's exact count too, so its \"AniList lists N\" matches the season page", () => {
    for (const alias of ["count1", "count2", "count3"]) {
      const args = mediaArgs(landingExtrasQuery, alias);
      expect(args).toContain(SEASON_LIST_FILTER);
      expect(args).not.toMatch(/format/);
    }
  });
});
