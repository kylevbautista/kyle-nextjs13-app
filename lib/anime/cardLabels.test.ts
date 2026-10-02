import { describe, expect, it } from "vitest";
import {
  NO_SYNOPSIS,
  allGenres,
  cardMeta,
  cardStatusLabel,
  cardStatusParts,
  coverTint,
  episodesFact,
  externalLinks,
  footerLinks,
  formatSource,
  genresLine,
  nextNumberedPast,
  numberingNote,
  premiereParts,
  scorePill,
  sheetActionText,
  sheetFacts,
  studioFact,
  studiosLabel,
  unknownText,
} from "./cardLabels";
import { normalizeMedia } from "./normalize";
import type { AnimeMedia } from "./types";

const NOW_S = Date.UTC(2026, 9, 1, 16, 30) / 1000;

const media = (extra: object = {}): AnimeMedia => {
  const item = normalizeMedia({
    id: 1,
    title: { romaji: "Show", english: null, native: null },
    ...extra,
  });
  if (!item) throw new Error("bad fixture");
  return item;
};

const fact = (m: AnimeMedia, term: string, continuing = false) =>
  sheetFacts(m, continuing).find((f) => f.term === term)?.value;

describe("cardStatusLabel", () => {
  it("covers every release status without saying TBA", () => {
    const cases: [object, string][] = [
      [{ status: "FINISHED", episodes: 12 }, "Finished · 12\u00A0eps"],
      [{ status: "FINISHED", episodes: 1, format: "TV" }, "Finished · 1\u00A0ep"],
      [{ status: "FINISHED", episodes: null }, "Finished"],
      [{ status: "FINISHED", format: "MOVIE", episodes: 1 }, "Released"],
      [{ status: "FINISHED", format: "MOVIE", episodes: 3 }, "Finished · 3\u00A0eps"],
      [{ status: "RELEASING" }, "Airing · next date not listed"],
      [{ status: "NOT_YET_RELEASED", startDate: { year: 2026, month: 11, day: 13 } }, "Premiere · Nov 13, 2026"],
      [{ status: "NOT_YET_RELEASED", startDate: { year: 2026, month: 11, day: null } }, "Premiere · Nov 2026"],
      [{ status: "NOT_YET_RELEASED", startDate: { year: 2027, month: null, day: null } }, "Premiere · 2027"],
      [{ status: "NOT_YET_RELEASED" }, "Premiere · date not listed"],
      [{ status: "HIATUS" }, "On hiatus"],
      [{ status: "CANCELLED" }, "Cancelled"],
      [{ status: null }, "Schedule unknown"],
    ];
    for (const [extra, label] of cases) {
      const text = cardStatusLabel(media(extra));
      expect(text).toBe(label);
      expect(text).not.toMatch(/TBA/);
      const { kind, detail } = cardStatusParts(media(extra));
      expect(detail ? `${kind} · ${detail}` : kind).toBe(text);
    }
  });
});

describe("cardMeta / genresLine", () => {
  it("prints only what AniList has", () => {
    expect(
      cardMeta(media({ averageScore: 76, format: "TV", studios: { nodes: [{ name: "CloverWorks" }] } }))
    ).toEqual({ score: "7.6", rest: "TV · CloverWorks" });
    expect(cardMeta(media({ format: "MUSIC" }))).toEqual({ score: null, rest: "Music" });
    expect(cardMeta(media({ format: "TV", studios: { nodes: [] } }))).toEqual({ score: null, rest: "TV" });
    expect(cardMeta(media())).toEqual({ score: null, rest: "" });
  });

  it("keeps three genres", () => {
    expect(genresLine(media({ genres: ["Action", "Drama", "History", "Romance"] }))).toBe("Action · Drama · History");
    expect(genresLine(media({ genres: [] }))).toBe("");
  });
});

describe("formatSource / studiosLabel / unknownText", () => {
  it("formats", () => {
    expect(formatSource("LIGHT_NOVEL")).toBe("Light Novel");
    expect(formatSource(null)).toBeNull();
    expect(studiosLabel(media({ studios: { nodes: [{ name: "MAPPA" }, { name: "Studio Bind" }] } }))).toBe(
      "MAPPA × Studio Bind"
    );
    expect(studiosLabel(media())).toBeNull();
    expect(unknownText(media({ status: "NOT_YET_RELEASED" }))).toBe("TBA");
    expect(unknownText(media({ status: "RELEASING" }))).toBe("Not listed on AniList");
  });
});

describe("sheetFacts", () => {
  it("long runner with no episode count (Shin Chan)", () => {
    const shinChan = media({
      status: "RELEASING",
      format: "TV",
      episodes: null,
      upComingAirDate: { episode: [{ airingAt: NOW_S, episode: 1355 }] },
    });
    expect(fact(shinChan, "Episodes")).toBe("Not listed on AniList");
    expect(fact(shinChan, "AniList score")).toBe("No AniList score");
  });

  it("an unaired show says TBA", () => {
    const fresh = media({ status: "NOT_YET_RELEASED" });
    expect(fact(fresh, "Premiere")).toBe("TBA");
    expect(fact(fresh, "Format")).toBe("TBA");
    expect(fact(fresh, "Studio")).toBe("TBA");
    expect(fact(fresh, "Genres")).toBe("TBA");
  });

  it("a one-part movie has no Episodes row and a plain length", () => {
    const movie = media({ status: "FINISHED", format: "MOVIE", episodes: 1, duration: 110 });
    expect(fact(movie, "Episodes")).toBeUndefined();
    expect(fact(movie, "Length")).toBe("110 min");
  });

  it("a multi-part movie keeps the Episodes row", () => {
    const parts = media({ status: "FINISHED", format: "MOVIE", episodes: 3, duration: 60 });
    expect(fact(parts, "Episodes")).toBe("3");
    expect(fact(parts, "Length")).toBe("60 min per episode");
  });

  it("notes AniList's continuous numbering", () => {
    const cour2 = media({
      status: "RELEASING",
      episodes: 12,
      upComingAirDate: { episode: [{ airingAt: NOW_S, episode: 13 }] },
    });
    expect(fact(cour2, "Episodes")).toBe("12 · AniList numbers the next one EP 13");
  });

  it("plural studios, score and the continuing row", () => {
    const show = media({
      status: "RELEASING",
      averageScore: 82,
      season: "SUMMER",
      seasonYear: 2026,
      studios: { nodes: [{ name: "A" }, { name: "B" }] },
    });
    expect(fact(show, "Studios")).toBe("A × B");
    expect(fact(show, "AniList score")).toBe("8.2 / 10");
    expect(fact(show, "Continuing", true)).toBe("Started Summer 2026");
    expect(fact(show, "Continuing", false)).toBeUndefined();
  });
});

describe("externalLinks", () => {
  it("only links http(s) Crunchyroll pages", () => {
    const show = media({
      id: 7,
      idMal: 9,
      externalLinks: [
        { id: 1, site: "Crunchyroll", url: "javascript:alert(1)" },
        { id: 2, site: "Crunchyroll", url: "https://www.crunchyroll.com/series/x" },
      ],
    });
    expect(externalLinks(show).map((link) => link.site)).toEqual(["AniList", "MyAnimeList", "Crunchyroll"]);
    expect(externalLinks(show)[2].url).toBe("https://www.crunchyroll.com/series/x");
    expect(externalLinks(media({ idMal: null })).map((link) => link.site)).toEqual(["AniList"]);
  });
});

describe("sheetActionText", () => {
  it("answers successes and warns on failures", () => {
    expect(sheetActionText({ op: "add", ok: true })).toEqual({ kind: "Answer", text: "Added to your list." });
    expect(sheetActionText({ op: "remove", ok: true })).toEqual({ kind: "Answer", text: "Removed from your list." });
    expect(sheetActionText({ op: "add", ok: false }).kind).toBe("Warning");
    expect(sheetActionText({ op: "remove", ok: false }).text).toBe("Couldn't remove it from your list. Try again.");
  });
});

describe("classic card helpers", () => {
  const conan = media({
    status: "RELEASING",
    startDate: { year: 1996, month: 1, day: 8 },
    duration: 25,
    firstEpisode: { episode: [{ airingAt: Date.UTC(2022, 11, 24, 9) / 1000, episode: 1067 }] },
    upComingAirDate: { episode: [{ airingAt: NOW_S, episode: 1215 }] },
  });

  it("premiereParts: the first episode's date and time, else the start date", () => {
    const fresh = media({
      status: "RELEASING",
      firstEpisode: { episode: [{ airingAt: Date.UTC(2026, 9, 2, 16, 53) / 1000, episode: 1 }] },
    });
    expect(premiereParts(fresh)).toEqual({ date: "Oct 2, 2026", time: "9:53 AM PDT" });
    const cour2 = media({
      status: "NOT_YET_RELEASED",
      firstEpisode: { episode: [{ airingAt: Date.UTC(2026, 10, 19, 15) / 1000, episode: 13 }] },
    });
    expect(premiereParts(cour2)).toEqual({ date: "Nov 19, 2026", time: "7:00 AM PST" });
    expect(premiereParts(conan)).toEqual({ date: "Jan 8, 1996", time: null });
    expect(premiereParts(media({ startDate: { year: 2027, month: null, day: null } }))).toEqual({ date: "2027", time: null });
    expect(premiereParts(media())).toBeNull();
    const parts = premiereParts(fresh);
    expect(`${parts?.date}${parts?.time}`).not.toMatch(/[\u202F\u00A0]/);
  });

  it("episodesFact covers counts, lengths, long runners and movies", () => {
    const nb = (text: string) => text.replace(/ /g, "\u00A0");
    expect(episodesFact(media({ episodes: 12, duration: 24 }))).toEqual({ term: "Episodes", value: `${nb("12 ×")} ${nb("24 min")}` });
    expect(episodesFact(media({ episodes: 12 }))).toEqual({ term: "Episodes", value: nb("12 eps") });
    expect(episodesFact(media({ episodes: 1, format: "TV" }))).toEqual({ term: "Episodes", value: nb("1 ep") });
    expect(episodesFact(conan)).toEqual({ term: "Episodes", value: `${nb("25 min")} each` });
    expect(episodesFact(media({ format: "MOVIE", episodes: 1, duration: 110 }))).toEqual({ term: "Length", value: nb("110 min") });
    expect(episodesFact(media({ format: "MOVIE", episodes: 1 }))).toBeNull();
    expect(episodesFact(media({ format: "MOVIE", episodes: 3 }))).toEqual({ term: "Episodes", value: nb("3 eps") });
    expect(episodesFact(media())).toBeNull();
  });

  it("numberingNote only when AniList numbers past the count", () => {
    const cour = (next: number) =>
      media({ status: "RELEASING", episodes: 12, upComingAirDate: { episode: [{ airingAt: NOW_S, episode: next }] } });
    expect(numberingNote(cour(24))).toBe("AniList numbers the next one EP 24.");
    expect(nextNumberedPast(cour(12))).toBeNull();
    expect(numberingNote(conan)).toBeNull();
    expect(sheetFacts(cour(24), false).find((f) => f.term === "Episodes")?.value).toBe(
      "12 · AniList numbers the next one EP 24"
    );
  });

  it("studioFact, scorePill, allGenres", () => {
    expect(studioFact(media())).toBeNull();
    expect(studioFact(media({ studios: { nodes: [{ name: "OLM" }] } }))).toEqual({ term: "Studio", value: "OLM" });
    expect(studioFact(media({ studios: { nodes: [{ name: "A" }, { name: "B" }] } }))).toEqual({ term: "Studios", value: "A × B" });
    expect(scorePill(media({ averageScore: 82, format: "TV" }))).toEqual({ score: "8.2", format: "TV" });
    expect(scorePill(media({ format: "MOVIE" }))).toEqual({ score: null, format: "Movie" });
    expect(scorePill(media({ averageScore: 82 }))).toEqual({ score: "8.2", format: null });
    expect(scorePill(media())).toBeNull();
    expect(allGenres(media({ genres: ["Action", "", "Drama", "Fantasy", "Horror"] }))).toEqual(["Action", "Drama", "Fantasy", "Horror"]);
  });

  it("footerLinks: MAL, AniList, Crunchyroll (http only)", () => {
    const show = media({
      id: 7,
      idMal: 9,
      externalLinks: [{ id: 2, site: "Crunchyroll", url: "https://www.crunchyroll.com/series/x" }],
    });
    expect(footerLinks(show).map((link) => link.site)).toEqual(["MyAnimeList", "AniList", "Crunchyroll"]);
    expect(footerLinks(media({ idMal: null })).map((link) => link.site)).toEqual(["AniList"]);
  });

  it("coverTint: hex colors tint and edge, anything else only glows", () => {
    expect(coverTint("#e4a128")).toEqual({ "--card-glow": "#e4a128", "--card-tint": "#e4a1282b", "--card-edge": "#e4a12873" });
    expect(coverTint(null)).toEqual({ "--card-glow": "rgba(93,174,241,.55)" });
    expect(coverTint("rgb(1,2,3)")).toEqual({ "--card-glow": "rgb(1,2,3)" });
    expect(NO_SYNOPSIS).toBe("AniList has no synopsis for this show.");
  });

  it("truth sweep: no placeholder ever reaches a card face", () => {
    const outputs: string[] = [];
    for (const status of ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "HIATUS", "CANCELLED", null])
      for (const [format, episodesForMovie] of [["TV", null], ["MOVIE", 1], ["MOVIE", 3], ["OVA", null], [null, null]] as const)
        for (const episodes of [null, 1, 12])
          for (const duration of [null, 24])
            for (const source of [null, "LIGHT_NOVEL"])
              for (const studios of [[], [{ name: "A" }, { name: "B" }]])
                for (const averageScore of [null, 76]) {
                  const m = media({
                    status,
                    format,
                    episodes: episodesForMovie ?? episodes,
                    duration,
                    source,
                    studios: { nodes: studios },
                    averageScore,
                    upComingAirDate: { episode: episodes === 12 ? [{ airingAt: NOW_S, episode: 24 }] : [] },
                  });
                  const parts = cardStatusParts(m);
                  const prem = premiereParts(m);
                  const ep = episodesFact(m);
                  const pill = scorePill(m);
                  const studio = studioFact(m);
                  outputs.push(parts.kind, parts.detail ?? "x", cardStatusLabel(m), numberingNote(m) ?? "x");
                  if (prem) outputs.push(prem.date, prem.time ?? "x");
                  if (ep) outputs.push(ep.term, ep.value);
                  if (pill) outputs.push(pill.score ?? "x", pill.format ?? "x");
                  if (studio) outputs.push(studio.term, studio.value);
                  for (const value of [parts.detail, prem?.time, pill?.score, pill?.format]) expect(value).not.toBe("");
                }
    for (const text of outputs) expect(text).not.toMatch(/TBA|N\/A|\?|undefined|null|NaN/);
  });
});
