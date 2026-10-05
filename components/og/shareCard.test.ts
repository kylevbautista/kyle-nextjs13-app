import { describe, expect, it } from "vitest";
import type { ListEntry, ListStatus } from "@/lib/anime/types";
import {
  SHARE_VERSION_RE,
  drawableName,
  fitTitle,
  listShareCard,
  scheduleShareCard,
  shareVersion,
  textWidthEm,
  LIST_TITLE_WIDTH,
  SCHEDULE_TITLE_WIDTH,
} from "./shareCard";
import { listTitle, scheduleTitle } from "@/lib/anime/listCopy";

const at = (iso: number) => iso / 1000;
const MON = at(Date.UTC(2026, 8, 29, 2, 0)); // Mon 19:00 PDT
const SUN_LATE = at(Date.UTC(2026, 9, 5, 6, 30)); // Sun 23:30 PDT (Monday in UTC)
const THU = at(Date.UTC(2026, 9, 1, 20, 0));
const FRI = at(Date.UTC(2026, 9, 2, 20, 0));

const make = (
  id: number,
  status: string,
  listType: ListStatus,
  episodeProgressNumber: number,
  score: number | null,
  airingAt: number
): ListEntry =>
  ({
    id,
    title: { romaji: `Show ${id}`, english: null, native: null },
    status,
    episodes: 12,
    upcomingEpisode: null,
    upComingAirDate: { episode: [{ airingAt, episode: 2, timeUntilAiring: 0 }] },
    firstEpisode: { episode: [] },
    userData: { listType, episodeProgressNumber, score, startDate: null, finishDate: null },
  }) as unknown as ListEntry;

const FIXTURE = [
  make(1, "RELEASING", "watching", 10, 8, MON),
  make(2, "RELEASING", "watching", 5, null, SUN_LATE),
  make(3, "NOT_YET_RELEASED", "planning", 0, null, THU),
  make(4, "FINISHED", "completed", 12, 9.5, FRI),
  make(5, "RELEASING", "dropped", 3, null, FRI),
];
const ARABIC = "محمد"; // Arabic "Muhammad"

describe("listShareCard", () => {
  it("draws My List's visitor banner", () => {
    expect(listShareCard(FIXTURE, "Kyle")).toEqual({
      kind: "list",
      title: { name: "Kyle", text: "Kyle's list", size: 84 },
      sage: { kind: "Report", text: "Analysis complete: 5 shows on Kyle's list, 3 still airing." },
      sub: "What Kyle is watching, planning and has finished. Only Kyle can edit it.",
      stats: [
        { label: "Shows", value: "5" },
        { label: "Watching", value: "2" },
        { label: "Episodes seen", value: "30" },
        { label: "Mean score", value: "8.8" },
      ],
      empty: null,
      evolution: {
        tier: "demon",
        form: "Demon Slime",
        count: "5 shows on Kyle's list",
        progress: { ratio: 0.286, line: "5 more to Demon Lord" },
        final: null,
      },
      alt: "Kyle's anime list on kylevb: 5 shows, 2 watching, 30 episodes seen, mean score 8.8. Current form: Demon Slime.",
    });
  });

  it("handles an empty list, a lord and one show", () => {
    const empty = listShareCard([], "Eli");
    expect(empty.sage.text).toBe("Eli hasn't stored any shows yet.");
    expect(empty.stats).toBeNull();
    expect(empty.empty).toEqual({ title: "Nothing here yet", body: "Eli hasn't added any anime to their list." });
    expect(empty.evolution).toEqual({
      tier: "named",
      form: "Named Slime",
      count: "0 shows on Eli's list",
      progress: { ratio: 0, line: "3 more to Demon Slime" },
      final: null,
    });
    expect(empty.alt).toBe("Eli's anime list on kylevb: no shows yet. Current form: Named Slime.");
    const lord = listShareCard(Array.from({ length: 10 }, (_, i) => make(i + 1, "FINISHED", "completed", 1, null, FRI)), "Kyle");
    expect(lord.evolution.progress).toBeNull();
    expect(lord.evolution.final).toBe("Final form reached. For now.");
    const one = listShareCard([make(1, "FINISHED", "completed", 1, null, FRI)], "Kyle");
    expect(one.evolution.count).toBe("1 show on Kyle's list");
    expect(one.alt).toContain("1 show, 0 watching, 1 episode seen, no scores yet.");
  });

  it("uses neutral words for a name Satori can't shape, but keeps it in the alt", () => {
    const card = listShareCard(FIXTURE, ARABIC);
    expect(card.title).toEqual({ name: null, text: "Anime list", size: 84 });
    expect(card.sage.text).toBe("Analysis complete: 5 shows on this list, 3 still airing.");
    expect(card.sub).toBe("What its owner is watching, planning and has finished. Only its owner can edit it.");
    expect(card.alt.startsWith(`${ARABIC}'s anime list on kylevb:`)).toBe(true);
  });
});

describe("scheduleShareCard", () => {
  it("draws the week strip from the stored next episodes (Pacific Time)", () => {
    expect(scheduleShareCard(FIXTURE, "Kyle")).toEqual({
      kind: "schedule",
      title: { name: "Kyle", text: "Kyle's airing schedule", size: 84 },
      sage: { kind: "Notice", text: "Thought Acceleration: Kyle's week, computed in Pacific Time." },
      sub: "3 shows with an upcoming episode, lined up by the day it airs. Completed and dropped shows stay out of the way.",
      tabs: [
        { label: "All", count: 3, selected: true },
        { label: "Mon", count: 1, selected: false },
        { label: "Tue", count: 0, selected: false },
        { label: "Wed", count: 0, selected: false },
        { label: "Thu", count: 1, selected: false },
        { label: "Fri", count: 0, selected: false },
        { label: "Sat", count: 0, selected: false },
        { label: "Sun", count: 1, selected: false },
      ],
      empty: null,
      tier: "demon",
      alt: "Kyle's airing schedule on kylevb: 3 shows with an upcoming episode. By weekday in Pacific Time: Monday 1, Thursday 1, Sunday 1.",
    });
  });

  it("says why the strip is empty", () => {
    const none = scheduleShareCard([], "Eli");
    expect(none.tabs).toBeNull();
    expect(none.empty).toBe("Eli hasn't added any anime yet");
    expect(none.sub).toBe("Every show on the list with an upcoming episode, lined up by the day it airs.");
    expect(none.alt).toBe("Eli's airing schedule on kylevb: Eli hasn't added any anime yet.");
    const off = scheduleShareCard(FIXTURE.slice(3), "Eli");
    expect(off.empty).toBe("Nothing on Eli's airing schedule");
    expect(off.alt).toBe("Eli's airing schedule on kylevb: nothing on Eli's airing schedule.");
    const rtl = scheduleShareCard(FIXTURE, ARABIC);
    expect(rtl.title.text).toBe("Airing schedule");
    expect(rtl.sage.text).toBe("Thought Acceleration: this list's week, computed in Pacific Time.");
  });
});

describe("names", () => {
  it("fits the title, clipping the name before ever losing \"'s list\"", () => {
    const rows: [string | null, string, number, string, number][] = [
      ["Kyle", "Kyle's list", 84, "Kyle's airing schedule", 84],
      ["Anonymous", "Anonymous's list", 68, "Anonymous's airing schedule", 68],
      ["Maximilianopolis", "Maximilianopolis's list", 56, "Maximilianopolis's airing schedule", 56],
      ["Maximilianopolis-Alexandrovich", "Maximilianopolis-…'s list", 56, "Maximilianopolis-…'s airing schedule", 56],
      ["WWWWWWWWWWWW", "WWWWWWWWW…'s list", 56, "WWWWWWWW…'s airing schedule", 56],
      ["カイル", "カイル's list", 84, "カイル's airing schedule", 84],
      ["Kyle\u{1F525}", "Kyle\u{1F525}'s list", 84, "Kyle\u{1F525}'s airing schedule", 84],
      ["Алексей", "Алексей's list", 84, "Алексей's airing schedule", 68],
      [null, "Anime list", 84, "Airing schedule", 84],
    ];
    for (const [name, aText, aSize, bText, bSize] of rows) {
      const a = fitTitle(name, listTitle, LIST_TITLE_WIDTH);
      const b = fitTitle(name, scheduleTitle, SCHEDULE_TITLE_WIDTH);
      expect([a.text, a.size], String(name)).toEqual([aText, aSize]);
      expect([b.text, b.size], String(name)).toEqual([bText, bSize]);
    }
    expect(textWidthEm("Kyle's list")).toBeCloseTo(4.376, 3);
  });

  it("strips invisible format characters and refuses unshaped scripts", () => {
    expect(drawableName("Kyle")).toBe("Kyle");
    for (const name of ["\u202EKyle", "\u2066Kyle\u2069", "\u061CKyle", "Ky\u200Ble"]) expect(drawableName(name)).toBe("Kyle");
    // Arabic "Muhammad", Hebrew "Dana", Devanagari "Anu", Thai "Somchai".
    for (const name of [ARABIC, "דנה", "अनु", "สมชาย"]) {
      expect(drawableName(name)).toBeNull();
    }
    for (const name of ["Алексей", "カイル"]) expect(drawableName(name)).toBe(name);
    // Emoji are dropped (twemoji 14 is fetched at render time; newer ones draw blank).
    expect(drawableName("\u{1F468}\u200D\u{1F469}\u200D\u{1F467}")).toBeNull();
    expect(drawableName("Kyle\u{1F525}")).toBe("Kyle");
    expect(drawableName("\u{1FAE8} Kyle")).toBe("Kyle");
    // "Fancy text" (math alphanumerics, full-width) is normalized to letters Geist draws.
    expect(drawableName("\u{1D4DA}\u{1D502}\u{1D4F5}\u{1D4EE}")).toBe("Kyle");
    expect(drawableName("\uFF2B\uFF39\uFF2C\uFF25")).toBe("KYLE");
    const long = "A".repeat(30);
    expect(drawableName(long)).toBe(`${"A".repeat(23)}…`);
  });
});

describe("neutral fallback", () => {
  it("draws no name, but keeps it in the alt", () => {
    const card = listShareCard(FIXTURE, "カイル", { neutral: true });
    expect(card.title.text).toBe("Anime list");
    expect(card.sage.text).toBe("Analysis complete: 5 shows on this list, 3 still airing.");
    expect(card.alt.startsWith("カイル's anime list")).toBe(true);
    expect(scheduleShareCard(FIXTURE, "カイル", { neutral: true }).title.text).toBe("Airing schedule");
  });
});

describe("shareVersion", () => {
  it("keys the URL on exactly what is drawn", () => {
    const list = listShareCard(FIXTURE, "Kyle");
    const schedule = scheduleShareCard(FIXTURE, "Kyle");
    for (const card of [list, schedule, listShareCard([], "Eli"), scheduleShareCard([], "Eli")]) {
      expect(shareVersion(card)).toMatch(SHARE_VERSION_RE);
      expect(shareVersion(card)).toBe(shareVersion(card));
      expect(shareVersion(card, 2)).not.toBe(shareVersion(card, 1));
    }
    const rescored = FIXTURE.map((e, i) => (i === 0 ? { ...e, userData: { ...e.userData, score: 3 } } : e));
    expect(shareVersion(listShareCard(rescored, "Kyle"))).not.toBe(shareVersion(list));
    expect(shareVersion(scheduleShareCard(rescored, "Kyle"))).toBe(shareVersion(schedule));
    const paused = FIXTURE.map((e, i) => (i === 1 ? { ...e, userData: { ...e.userData, listType: "paused" as const } } : e));
    expect(shareVersion(listShareCard(paused, "Kyle"))).not.toBe(shareVersion(list));
    expect(shareVersion(listShareCard(FIXTURE, "Eli"))).not.toBe(shareVersion(list));
    const moved = (seconds: number) =>
      FIXTURE.map((e, i) => (i === 0 ? { ...e, upComingAirDate: { episode: [{ airingAt: seconds, episode: 2, timeUntilAiring: 0 }] } } : e));
    expect(shareVersion(scheduleShareCard(moved(MON + 86_400), "Kyle"))).not.toBe(shareVersion(schedule)); // Tuesday now
    expect(shareVersion(scheduleShareCard(moved(MON + 3_600), "Kyle"))).toBe(shareVersion(schedule)); // still Monday
  });
});
