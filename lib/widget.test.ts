import { describe, expect, it } from "vitest";
import { NOW, NOW_S, USER_ID, coverUrl, makeEntry, mixedEntries, payloadAt, scenarioEntries } from "@/widgets/scriptable/fixtures";
import { widgetCopy } from "@/lib/anime/widgetCopy";
import { normalizeEntry, normalizeMedia } from "@/lib/anime/normalize";
import type { ListEntry } from "@/lib/anime/types";
import { WIDGET_PROJECTION, readEntries } from "@/server/lib/userList";
import {
  WIDGET_PAYLOAD_MAX_BYTES,
  WIDGET_REFRESH,
  buildWidgetPayload,
  clipGraphemes,
  parseWidgetParameter,
  pickWidgetRows,
  toWidgetRow,
  widgetHungrySince,
  widgetIsHungry,
  widgetNextRefreshMs,
  widgetRowLines,
  widgetRowPhase,
  widgetTickerRow,
  type WidgetRow,
} from "./widget";

const SCHEDULE = `https://kylevb.com/mylist/${USER_ID}`;

describe("buildWidgetPayload", () => {
  it("is the spec's example, field for field", () => {
    const row = (
      id: number,
      title: string,
      label: string,
      at: number,
      day: string,
      time: string,
      cover: string | null,
      color: string | null,
      tab: string
    ): WidgetRow => ({
      id,
      title,
      label,
      at,
      day,
      time,
      when: day.includes(" ") ? `${day}, ${time}` : `${day} ${time}`,
      cover,
      color,
      url: `${SCHEDULE}?day=${tab}`,
    });
    expect(payloadAt("mixed")).toEqual({
      schema: 1,
      generatedAt: NOW,
      state: "rows",
      owner: { name: "Kyle", tier: "lord" },
      hungrySince: NOW_S,
      rows: [
        row(182205, "That Time I Got Reincarnated as a Slime Season 4", "EP 7", 1792072200, "Thu", "6:50 AM PT", coverUrl(182205), "#43a1e4", "thu"),
        row(200001, "Frieren: Beyond Journey's End Season 2", "EP 4", 1792074600, "Thu", "7:30 AM PT", coverUrl(200001), "#d6e4a1", "thu"),
        row(200002, "Kaiju Patrol", "EP 13", 1792081800, "Thu", "9:30 AM PT", coverUrl(200002), null, "thu"),
        row(200006, "Witch Watch Season 2", "EP 2", 1792130400, "Thu", "11:00 PM PT", null, "#e45d8e", "thu"),
        row(200003, "Witch Hat Atelier", "Premiere", 1792162800, "Fri", "8:00 AM PT", coverUrl(200003), "#e4bb6b", "fri"),
        row(200004, "Detective Example", "Next EP", 1792255500, "Sat", "9:45 AM PT", null, "#5d86e4", "sat"),
        row(200005, "Monthly Example Season 2", "EP 14", 1792688400, "Thu Oct 22", "10:00 AM PT", coverUrl(200005), "#a1e4d6", "thu"),
      ],
      links: {
        schedule: SCHEDULE,
        week: `${SCHEDULE}?day=all`,
        list: `https://kylevb.com/user/${USER_ID}`,
        browse: "https://kylevb.com/anime",
      },
      art: { version: 1, base: "https://kylevb.com/api/widget/art/" },
      script: {
        latest: 1,
        source: "https://github.com/kylevbautista/kyle-nextjs13-app/blob/main/widgets/scriptable/kylevb-anime.js",
      },
      tuning: { jsonTimeoutS: 5, coverFetches: 3, largeSkyMaxScale: 3 },
      copy: widgetCopy("Kyle", "rows", NOW),
    });
  });

  it("picks the Airing Schedule's rows: buildSchedule + visibleAiring, soonest first, dropped and completed left out", () => {
    const entries = [
      makeEntry({ id: 1, title: "Dropped but airing", at: NOW_S + 600, status: "dropped" }),
      makeEntry({ id: 2, title: "Completed but airing", at: NOW_S + 700, status: "completed" }),
      makeEntry({ id: 3, title: "Later", at: NOW_S + 7200 }),
      makeEntry({ id: 4, title: "Sooner", at: NOW_S + 3000, status: "paused" }),
      makeEntry({ id: 5, title: "Planned", at: NOW_S + 5000, status: "planning" }),
      makeEntry({ id: 6, title: "No schedule" }),
    ];
    const payload = buildWidgetPayload({ userId: USER_ID, name: "Kyle", entries, nowMs: NOW });
    expect(payload.rows.map((r) => r.id)).toEqual([4, 5, 3]);
    expect(payload.owner.tier).toBe("demon");
  });

  it("drops rows aired more than 30 min before now and sends at most 8", () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      makeEntry({ id: 10 + i, title: `Show ${i}`, at: NOW_S - 1801 + i * 600 })
    );
    const rows = buildWidgetPayload({ userId: USER_ID, name: "Kyle", entries, nowMs: NOW }).rows;
    expect(rows).toHaveLength(8);
    expect(rows[0].id).toBe(11); // 1,201 s ago: still within the grace
    // The boundary itself is kept (visibleAiring's airingAt ≥ cutoff).
    const edge = makeEntry({ id: 99, title: "Edge", at: NOW_S - 1800 });
    expect(buildWidgetPayload({ userId: USER_ID, name: "K", entries: [edge], nowMs: NOW }).rows).toHaveLength(1);
  });

  it("labels are absolute: no Today/Tomorrow/Yesterday; the weekday 0–6 PT days out, the date with its weekday from 7", () => {
    const rows = payloadAt("mixed").rows;
    for (const r of rows) expect(r.when).not.toMatch(/today|tomorrow|yesterday/i);
    expect(rows.map((r) => r.when)).toEqual([
      "Thu 6:50 AM PT",
      "Thu 7:30 AM PT",
      "Thu 9:30 AM PT",
      "Thu 11:00 PM PT",
      "Fri 8:00 AM PT",
      "Sat 9:45 AM PT",
      "Thu Oct 22, 10:00 AM PT",
    ]);
  });

  it("keeps the PT wall time across the Nov 1 2026 DST end", () => {
    const fri = Date.parse("2026-10-30T16:00:00Z");
    const entries = [
      makeEntry({ id: 1, title: "Sat", at: Date.parse("2026-10-31T16:30:00Z") / 1000 }),
      makeEntry({ id: 2, title: "Mon", at: Date.parse("2026-11-02T17:30:00Z") / 1000 }),
    ];
    const rows = buildWidgetPayload({ userId: USER_ID, name: "K", entries, nowMs: fri }).rows;
    expect(rows.map((r) => r.when)).toEqual(["Sat 9:30 AM PT", "Mon 9:30 AM PT"]);
    expect(rows.map((r) => r.url.slice(-3))).toEqual(["sat", "mon"]);
  });

  it("states: empty-list, nothing-scheduled, resting, rows", () => {
    expect(payloadAt("empty-list").state).toBe("empty-list");
    expect(payloadAt("empty-list").owner.tier).toBe("named");
    expect(payloadAt("nothing-scheduled").state).toBe("nothing-scheduled");
    expect(payloadAt("nothing-scheduled").rows).toEqual([]);
    expect(payloadAt("resting").state).toBe("resting");
    expect(payloadAt("resting").rows).toEqual([]);
    expect(payloadAt("one-row").state).toBe("rows");
    expect(payloadAt("empty-list").copy.state?.text).toBe("Recommend: predation.");
    expect(payloadAt("nothing-scheduled").copy.state?.title).toBe("Nothing on Kyle's airing schedule");
  });

  it("names the owner by first name, clipped to 20 graphemes (emoji and ZWJ sequences intact), and sends no private field", () => {
    const family = "👨‍👩‍👧‍👦";
    const name = `Maximiliano${family}AlejandroLong`;
    const payload = buildWidgetPayload({ userId: USER_ID, name, entries: mixedEntries(), nowMs: NOW });
    expect(payload.owner.name).toBe(`Maximiliano${family}Alejand…`);
    expect(Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(payload.owner.name))).toHaveLength(20);
    expect(clipGraphemes("Kyle", 20)).toBe("Kyle");
    expect(clipGraphemes("a".repeat(81), 80)).toBe(`${"a".repeat(79)}…`);

    const keys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [key, inner] of Object.entries(value)) {
          keys.add(key);
          walk(inner);
        }
      }
    };
    walk(payload);
    for (const key of ["email", "image", "userData", "following", "listRefreshedAt", "description", "progress", "score", "episodeProgressNumber", "listType"]) {
      expect(keys.has(key), key).toBe(false);
    }
    expect(JSON.stringify(payload)).not.toMatch(/Stored|description|@/);
  });

  it("tier is evolutionTier(true, entries.length): named < 3, demon 3–9, lord 10+", () => {
    const list = (n: number) => Array.from({ length: n }, (_, i) => makeEntry({ id: 700 + i, title: `S${i}` }));
    const tier = (n: number) => buildWidgetPayload({ userId: USER_ID, name: "K", entries: list(n), nowMs: NOW }).owner.tier;
    expect([0, 2, 3, 9, 10, 40].map(tier)).toEqual(["named", "named", "demon", "demon", "lord", "lord"]);
  });

  it("covers: large, else medium, s4.anilist.co only; colors #rrggbb or null", () => {
    const base = { id: 1, title: "X", at: NOW_S + 600 };
    const withCover = (coverImage: object) =>
      toWidgetRow({ ...makeEntry(base), coverImage: { extraLarge: null, large: null, medium: null, color: null, ...coverImage } }, USER_ID, NOW);
    expect(withCover({ large: "https://s4.anilist.co/l.jpg", medium: "https://s4.anilist.co/m.jpg" }).cover).toBe("https://s4.anilist.co/l.jpg");
    expect(withCover({ medium: "https://s4.anilist.co/m.jpg" }).cover).toBe("https://s4.anilist.co/m.jpg");
    expect(withCover({ large: "https://img.anili.st/l.jpg" }).cover).toBeNull();
    expect(withCover({ color: "#abc" }).color).toBeNull();
    expect(withCover({ color: "#AABBCC" }).color).toBe("#AABBCC");
    expect(withCover({ color: "#aabbccdd" }).color).toBeNull();
  });

  it("links rows to the PT weekday tab; every link is absolute https://kylevb.com", () => {
    const payload = payloadAt("mixed");
    expect(payload.rows.map((r) => r.url.split("?day=")[1])).toEqual(["thu", "thu", "thu", "thu", "fri", "sat", "thu"]);
    for (const url of [...payload.rows.map((r) => r.url), ...Object.values(payload.links), payload.art.base]) {
      expect(url.startsWith("https://kylevb.com/")).toBe(true);
    }
  });

  it("hungrySince: now when an unlogged aired episode exists, else the first air time that brings one, else null; Watching/Paused only", () => {
    expect(widgetHungrySince(mixedEntries(), NOW)).toBe(NOW_S);
    expect(payloadAt("not-hungry").hungrySince).toBe(NOW_S + 2 * 3600);
    expect(payloadAt("hungry").hungrySince).toBe(NOW_S);
    const planned = makeEntry({ id: 1, title: "P", at: NOW_S - 600, episode: 5, progress: 0, status: "planning" });
    const paused = makeEntry({ id: 2, title: "Q", at: NOW_S + 900, episode: 3, progress: 2, status: "paused" });
    const later = makeEntry({ id: 3, title: "R", at: NOW_S + 300, episode: 3, progress: 2, status: "watching" });
    expect(widgetHungrySince([planned], NOW)).toBeNull();
    expect(widgetHungrySince([planned, paused], NOW)).toBe(NOW_S + 900);
    expect(widgetHungrySince([paused, later], NOW)).toBe(NOW_S + 300);
    expect(widgetHungrySince([makeEntry({ id: 4, title: "Ahead", at: NOW_S + 300, episode: 3, progress: 5 })], NOW)).toBeNull();
  });

  it("the worst-case payload (8 rows, 80-grapheme CJK titles, dated labels, a 2,000-show list) stays ≤ 8,192 bytes", () => {
    const payload = payloadAt("worst-case", NOW, "Maximiliano-Alejandro");
    expect(payload.rows).toHaveLength(8);
    expect(payload.rows[0].title).toBe(`${"転".repeat(79)}…`);
    expect(payload.rows[0].when).toMatch(/^Fri Oct 23, /);
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    expect(bytes).toBeLessThanOrEqual(WIDGET_PAYLOAD_MAX_BYTES);
    expect(new TextEncoder().encode(JSON.stringify(payloadAt("mixed"))).length).toBeLessThan(5000);
  });

  it("is the same from WIDGET_PROJECTION-projected entries as from full ones, and needs every projected field", () => {
    const keys = Object.keys(WIDGET_PROJECTION).filter((key) => key.startsWith("following."));
    // The full side fills every field the projection leaves out, so a payload that starts reading one differs.
    const projected = new Set(keys.map((key) => key.split(".")[1]));
    const blank = normalizeMedia({ id: 1 }) as unknown as Stored;
    expect(Object.keys(blank).filter((key) => !projected.has(key)).sort(), "a new AnimeMedia field needs a filler").toEqual(
      Object.keys(UNPROJECTED_MEDIA).sort()
    );
    // The same for userData, checked against the object the read path builds (normalizeEntry's).
    const projectedUserData = new Set(keys.filter((key) => key.startsWith("following.userData.")).map((key) => key.split(".")[2]));
    const blankUserData = (normalizeEntry({ id: 1 }) as ListEntry).userData as unknown as Stored;
    expect(Object.keys(blankUserData).filter((key) => !projectedUserData.has(key)).sort(), "a new UserAnimeData field needs a filler").toEqual(
      Object.keys(UNPROJECTED_USER_DATA).sort()
    );
    for (const scenario of SCENARIOS) {
      const stored = filled(storedList(scenario));
      for (const entry of stored) {
        for (const key of Object.keys(UNPROJECTED_MEDIA)) expect(entry[key], `${scenario} ${key}`).not.toEqual(blank[key]);
        for (const key of Object.keys(UNPROJECTED_USER_DATA)) {
          expect((entry.userData as Stored)[key], `${scenario} userData.${key}`).not.toEqual(blankUserData[key]);
        }
      }
      expect(payloadOf(readEntries({ following: projectEntries(stored, keys) })), scenario).toEqual(payloadOf(readEntries({ following: stored })));
    }
    // Each field changes some payload when it's left out, so none can be dropped from the projection unnoticed.
    for (const key of keys) {
      const without = keys.filter((k) => k !== key);
      const changed = SCENARIOS.some((scenario) => {
        const stored = storedList(scenario);
        const full = JSON.stringify(payloadOf(readEntries({ following: projectEntries(stored, keys) })));
        return JSON.stringify(payloadOf(readEntries({ following: projectEntries(stored, without) }))) !== full;
      });
      expect(changed, key).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// The projection test's lists: each one depends on a field the others don't.

type Stored = Record<string, unknown>;
const raw = (entry: Stored): Stored => JSON.parse(JSON.stringify(normalizeEntry(entry) as ListEntry));
const node = (airingAt: number, episode: number | null) => ({ airingAt, timeUntilAiring: 0, episode });
const userData = (listType: string, episodeProgressNumber: number) => ({ listType, episodeProgressNumber, startDate: null, finishDate: null, score: 8 });
const SPECIAL: Record<string, Stored[]> = {
  // status + episodes: a finished show with no schedule counts its episodes as aired (hungry).
  finished: [raw({ id: 801, title: { romaji: "Finished" }, status: "FINISHED", episodes: 12, upComingAirDate: { episode: [] }, userData: userData("watching", 10) })],
  // firstEpisode + status: a "not yet released" show whose own schedule has aired counts EP 4 (hungry).
  firstEpisode: [
    raw({
      id: 802,
      title: { romaji: "Late status" },
      status: "NOT_YET_RELEASED",
      episodes: 12,
      upComingAirDate: { episode: [node(NOW_S + 3600, 5)] },
      firstEpisode: { episode: [node(NOW_S - 30 * 86_400, 1)] },
      userData: userData("watching", 0),
    }),
  ],
  // upcomingEpisode: the schedule node has no number; the alias has it ("EP 7", not "Next EP").
  upcomingEpisode: [
    raw({
      id: 803,
      title: { romaji: "Alias number" },
      status: "RELEASING",
      episodes: 12,
      upcomingEpisode: { id: 1, episode: 7, timeUntilAiring: 0, mediaId: 803 },
      upComingAirDate: { episode: [node(NOW_S + 7200, null)] },
      userData: userData("watching", 6),
    }),
  ],
  // listType: a completed show still airing stays off the schedule.
  listType: [
    raw({ id: 804, title: { romaji: "Rewatch" }, status: "RELEASING", episodes: 12, upComingAirDate: { episode: [node(NOW_S + 3600, 9)] }, userData: userData("completed", 12) }),
    raw({ id: 805, title: { romaji: "Airing" }, status: "RELEASING", episodes: 12, upComingAirDate: { episode: [node(NOW_S + 7200, 3)] }, userData: userData("watching", 2) }),
  ],
};
const SCENARIOS = ["mixed", "hungry", "not-hungry", "resting", "premiere-unknown-long", ...Object.keys(SPECIAL)] as const;

/** A distinctive value for every media field WIDGET_PROJECTION leaves out (checked against normalizeMedia's keys). */
const UNPROJECTED_MEDIA: Stored = {
  idMal: 4242,
  description: "<b>Filled</b> synopsis",
  season: "FALL",
  seasonYear: 2026,
  format: "MOVIE",
  duration: 110,
  source: "MANGA",
  genres: ["Drama"],
  averageScore: 82,
  popularity: 12345,
  studios: { nodes: [{ name: "Studio Filled" }] },
  startDate: { year: 2026, month: 10, day: 2 },
  externalLinks: [{ id: 1, url: "https://example.com/watch", site: "Example" }],
};
const UNPROJECTED_USER_DATA: Stored = { startDate: Date.UTC(2026, 9, 1), finishDate: Date.UTC(2026, 9, 10), score: 7.5 };
const filled = (stored: Stored[]): Stored[] =>
  stored.map((entry) => raw({ ...entry, ...UNPROJECTED_MEDIA, userData: { ...(entry.userData as Stored), ...UNPROJECTED_USER_DATA } }));
const storedList = (scenario: string): Stored[] =>
  SPECIAL[scenario] ?? (JSON.parse(JSON.stringify(scenarioEntries(scenario as Parameters<typeof scenarioEntries>[0]))) as Stored[]);
const payloadOf = (entries: ListEntry[]) => buildWidgetPayload({ userId: USER_ID, name: "Kyle", entries, nowMs: NOW });

/** What Mongo returns for these "following.a.b" projection paths: each entry keeps only those subfields. */
function projectEntries(stored: Stored[], keys: string[]): Stored[] {
  return stored.map((entry) => {
    const out: Stored = {};
    for (const key of keys) {
      const path = key.split(".").slice(1);
      let from: unknown = entry;
      let to: Stored = out;
      for (let i = 0; i < path.length; i += 1) {
        if (!from || typeof from !== "object" || !(path[i] in (from as Stored))) break;
        from = (from as Stored)[path[i]];
        if (i === path.length - 1) to[path[i]] = from;
        else to = (to[path[i]] ??= {}) as Stored;
      }
    }
    return out;
  });
}

// ---------------------------------------------------------------------------

const row = (at: number, extra: Partial<WidgetRow> = {}): WidgetRow => ({
  id: at,
  title: "Frieren",
  label: "EP 4",
  at,
  day: "Thu",
  time: "7:30 AM PT",
  when: "Thu 7:30 AM PT",
  cover: null,
  color: null,
  url: `${SCHEDULE}?day=thu`,
  ...extra,
});
const COPY = { sep: " · ", aired: "Aired", ticker: "Next up" } as const;

describe("the phone's rules (reference implementations)", () => {
  it("widgetRowPhase: far ≥ 24 h, day 1–24 h, soon < 1 h, aired 0–30 min after, then gone", () => {
    const at = NOW_S;
    const phase = (offsetS: number) => widgetRowPhase(at, NOW - offsetS * 1000);
    expect(phase(86_400)).toBe("far");
    expect(phase(86_399)).toBe("day");
    expect(phase(3600)).toBe("day");
    expect(phase(3599)).toBe("soon");
    expect(phase(0.5)).toBe("soon");
    expect(phase(0)).toBe("aired");
    expect(phase(-1800)).toBe("aired");
    expect(phase(-1800.5)).toBe("gone");
  });

  it("pickWidgetRows keeps the first N not gone; widgetTickerRow skips an aired first row when a later one is visible", () => {
    const rows = [row(NOW_S - 2000), row(NOW_S - 600), row(NOW_S + 600), row(NOW_S + 7200)];
    expect(pickWidgetRows(rows, NOW, 2).map((r) => r.at)).toEqual([NOW_S - 600, NOW_S + 600]);
    expect(widgetTickerRow(rows, NOW)?.at).toBe(NOW_S + 600);
    expect(widgetTickerRow([row(NOW_S - 600)], NOW)?.at).toBe(NOW_S - 600);
    expect(widgetTickerRow([row(NOW_S - 2000)], NOW)).toBeNull();
    expect(widgetTickerRow([], NOW)).toBeNull();
  });

  it("widgetRowLines: the card line, the small and rectangular labels, the inline sentence", () => {
    expect(widgetRowLines(row(NOW_S + 600), "soon", COPY)).toEqual({
      line: "EP 4 · Thu 7:30 AM PT",
      smallLabel: "NEXT UP",
      smallA: "EP 4 · Thu",
      smallB: "7:30 AM PT",
      rectLabel: "NEXT UP · EP 4",
      rectLine3: "Thu 7:30 AM PT",
      inline: "Thu 7:30 AM PT · EP 4 · Frieren",
      timer: true,
      tone: "soon",
    });
    const aired = row(NOW_S - 900, { label: "EP 7", when: "Thu 6:50 AM PT", time: "6:50 AM PT" });
    expect(widgetRowLines(aired, "aired", COPY)).toMatchObject({
      line: "EP 7 · Aired Thu 6:50 AM PT",
      smallLabel: "AIRED",
      // The tense rides in the line too: the small widget's label slot may hold a saved copy's stamp.
      smallA: "EP 7 · Aired Thu",
      rectLabel: "AIRED · EP 7",
      inline: "Aired Thu 6:50 AM PT · EP 7 · Frieren",
      timer: false,
      tone: "aired",
    });
    const premiere = row(NOW_S + 26 * 3600, { label: "Premiere", day: "Thu Oct 22", when: "Thu Oct 22, 10:00 AM PT" });
    expect(widgetRowLines(premiere, "far", COPY)).toMatchObject({
      line: "Premiere · Thu Oct 22, 10:00 AM PT",
      smallA: "Premiere · Thu Oct 22",
      rectLabel: "NEXT UP · PREMIERE",
      timer: false,
      tone: "sage",
    });
    expect(widgetRowLines(row(0, { label: "Next EP" }), "day", COPY)).toMatchObject({ rectLabel: "NEXT UP", timer: true, tone: "sage" });
    expect(widgetRowLines(row(0, { label: "Next EP" }), "aired", COPY).rectLabel).toBe("AIRED");
  });

  it("widgetIsHungry: already (hungrySince ≤ generatedAt) whatever the phone's clock says, else from hungrySince", () => {
    expect(widgetIsHungry({ hungrySince: NOW_S, generatedAt: NOW }, NOW - 5000)).toBe(true); // phone 5 s behind
    expect(widgetIsHungry({ hungrySince: NOW_S + 600, generatedAt: NOW }, NOW)).toBe(false);
    expect(widgetIsHungry({ hungrySince: NOW_S + 600, generatedAt: NOW }, NOW + 600_000)).toBe(true);
    expect(widgetIsHungry({ hungrySince: null, generatedAt: NOW }, NOW)).toBe(false);
  });

  it("parseWidgetParameter: links, ids, glass and junk", () => {
    const id = "65f1c0ffee0123456789abcd";
    const none = { id: null, glass: false, unknown: [], link: false };
    for (const raw of [
      `https://kylevb.com/user/${id}`,
      `kylevb.com/user/${id}`,
      `https://kylevb.com/mylist/${id.toUpperCase()}?day=all`,
      `https://kyle-git-branch.vercel.app/user/${id}#x`,
      id,
      `  ${id.toUpperCase()}  `,
      // The punctuation a link picks up in a sentence or a chat.
      `https://kylevb.com/user/${id}.`,
      `(https://kylevb.com/user/${id})`,
      `<https://kylevb.com/user/${id}>`,
      `"https://kylevb.com/user/${id}"`,
      `\u201chttps://kylevb.com/user/${id}\u201d!`,
    ]) {
      expect(parseWidgetParameter(raw), raw).toEqual({ ...none, id });
    }
    expect(parseWidgetParameter(`glass, ${id}`)).toEqual({ ...none, id, glass: true });
    expect(parseWidgetParameter(`${id};GLASS`)).toEqual({ ...none, id, glass: true });
    expect(parseWidgetParameter("glass")).toEqual({ ...none, glass: true });
    expect(parseWidgetParameter("(glass)")).toEqual({ ...none, glass: true });
    expect(parseWidgetParameter("my list please")).toEqual({ ...none, unknown: ["my", "list", "please"] });
    // A link that isn't a list link (cut off, another page's) is flagged, so the app doesn't call it words.
    for (const raw of [`https://kylevb.com/user/${id.slice(0, 20)}`, "https://kylevb.com/anime", "kylevb.com/mylist", "http:x"]) {
      expect(parseWidgetParameter(raw), raw).toMatchObject({ id: null, link: true });
    }
    expect(parseWidgetParameter("glass mode").link).toBe(false);
    // The script's own name (shown right above the Parameter in Edit Widget) and the bare brand word are words;
    // a host is a link.
    for (const raw of ["kylevb-anime", "kylevb", "Kylevb Anime"]) expect(parseWidgetParameter(raw).link, raw).toBe(false);
    for (const raw of ["kylevb.com", "www.kylevb.com"]) expect(parseWidgetParameter(raw).link, raw).toBe(true);
    expect(parseWidgetParameter(`${id}0`).id).toBeNull();
    expect(parseWidgetParameter(`/user/a3lsZUBleGFtcGxlLmNvbQ`).id).toBeNull();
    expect(parseWidgetParameter(`${id} 65f000000000000000000001`)).toEqual({ ...none, id, unknown: ["65f000000000000000000001"] });
    expect(parseWidgetParameter("")).toEqual(none);
    expect(parseWidgetParameter("( )")).toEqual(none);
    expect(parseWidgetParameter(null)).toEqual(none);
    expect(parseWidgetParameter(42)).toEqual(none);
  });

  it("widgetNextRefreshMs: the next row boundary + 15 s, within [5 min, the outcome's cap]", () => {
    // Medium at 7:05 showing rows aired 6:50 and airing 7:30: 7:20 (row 0 drops) wins.
    expect(widgetNextRefreshMs([{ at: 1792072200 }, { at: 1792074600 }], NOW, "ok", null)).toBe((1792072200 + 1800) * 1000 + 15_000);
    // Small shows only 7:30: its air time.
    expect(widgetNextRefreshMs([{ at: 1792074600 }], NOW, "ok", null)).toBe(1792074600 * 1000 + 15_000);
    // Nothing near: the cap.
    expect(widgetNextRefreshMs([{ at: NOW_S + 3 * 86_400 }], NOW, "ok", null)).toBe(NOW + WIDGET_REFRESH.okMs);
    expect(widgetNextRefreshMs([], NOW, "saved", null)).toBe(NOW + WIDGET_REFRESH.savedMs);
    expect(widgetNextRefreshMs([], NOW, "setup", null)).toBe(NOW + WIDGET_REFRESH.idleMs);
    expect(widgetNextRefreshMs([], NOW, "outdated", null)).toBe(NOW + WIDGET_REFRESH.outdatedMs);
    // A boundary a minute away is held to the 5-minute floor.
    expect(widgetNextRefreshMs([{ at: NOW_S + 60 }], NOW, "ok", null)).toBe(NOW + WIDGET_REFRESH.minMs);
    // hungrySince ahead is a boundary; one already passed isn't.
    expect(widgetNextRefreshMs([], NOW, "ok", NOW_S + 600)).toBe(NOW + 600_000 + 15_000);
    expect(widgetNextRefreshMs([], NOW, "ok", NOW_S - 600)).toBe(NOW + WIDGET_REFRESH.okMs);
  });
});
