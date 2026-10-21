import { beforeAll, describe, expect, it } from "vitest";
import { scriptExports } from "@/widgets/scriptable/harness";
import {
  RESTING_LINE,
  SAGE_NAME_MAX,
  clipGraphemes,
  sageColumns,
  unavailableLine,
  WIDGET_FALLBACK_COPY,
  WIDGET_RESTING,
  offlineLine,
  pacificStamp,
  savedNote,
  widgetCopy,
  widgetStateLine,
  widgetWhen,
  type WidgetLine,
} from "./widgetCopy";

/** Thu 2026-10-15 7:05 AM PDT. */
const NOW = 1792073100000;
const at = (iso: string) => Date.parse(iso) / 1000;

describe("widgetWhen: absolute Pacific Time labels", () => {
  it("names the weekday 0–6 days out, the date with its weekday from 7, the year when it differs", () => {
    expect(widgetWhen(at("2026-10-15T16:30:00Z"), NOW)).toEqual({ day: "Thu", time: "9:30 AM PT", when: "Thu 9:30 AM PT" });
    expect(widgetWhen(at("2026-10-16T15:00:00Z"), NOW)).toEqual({ day: "Fri", time: "8:00 AM PT", when: "Fri 8:00 AM PT" });
    expect(widgetWhen(at("2026-10-21T16:30:00Z"), NOW).when).toBe("Wed 9:30 AM PT");
    expect(widgetWhen(at("2026-10-22T17:00:00Z"), NOW)).toEqual({
      day: "Thu Oct 22",
      time: "10:00 AM PT",
      when: "Thu Oct 22, 10:00 AM PT",
    });
    expect(widgetWhen(at("2027-01-07T18:00:00Z"), NOW).when).toBe("Thu Jan 7, 2027, 10:00 AM PT");
    // An aired row from the previous PT day (rendered just after midnight) has no "Yesterday".
    expect(widgetWhen(at("2026-10-15T06:50:00Z"), Date.parse("2026-10-15T07:10:00Z"))).toEqual({
      day: "Wed Oct 14",
      time: "11:50 PM PT",
      when: "Wed Oct 14, 11:50 PM PT",
    });
  });

  it("keeps the PT wall time across the Nov 1 2026 DST end", () => {
    expect(widgetWhen(at("2026-10-31T16:30:00Z"), Date.parse("2026-10-30T16:00:00Z")).when).toBe("Sat 9:30 AM PT");
    expect(widgetWhen(at("2026-11-02T17:30:00Z"), Date.parse("2026-10-30T16:00:00Z")).when).toBe("Mon 9:30 AM PT");
  });
});

describe("saved-copy stamps", () => {
  it("date the copy in Pacific Time", () => {
    expect(pacificStamp(NOW)).toBe("Oct 15, 7:05 AM PT");
    expect(savedNote(NOW)).toBe("Saved Oct 15, 7:05 AM PT");
    expect(offlineLine(NOW)).toBe("Couldn't reach kylevb.com. Showing air times saved Oct 15, 7:05 AM PT.");
    // 11:40 PM PDT on Oct 31 and 12:30 AM PST on Nov 2 (the UTC day differs from the PT day).
    expect(pacificStamp(Date.parse("2026-11-01T06:40:00Z"))).toBe("Oct 31, 11:40 PM PT");
    expect(pacificStamp(Date.parse("2026-11-01T08:30:00Z"))).toBe("Nov 1, 1:30 AM PT");
    expect(pacificStamp(Date.parse("2026-11-02T08:30:00Z"))).toBe("Nov 2, 12:30 AM PT");
  });
});

describe("widgetCopy", () => {
  const base = {
    tags: { Notice: "《Notice》", Report: "《Report》", Warning: "《Warning》" },
    sep: " · ",
    eyebrow: "Skill 03 · Thought Acceleration",
    sage: "Thought Acceleration: Kyle's week, computed in Pacific Time.",
    title: "Kyle's airing schedule",
    header: "Next episodes",
    headerNote: "Pacific Time",
    ticker: "Next up",
    footer: "The whole week →",
    aired: "Aired",
    savedNote: "Saved Oct 15, 7:05 AM PT",
    offline: "Couldn't reach kylevb.com. Showing air times saved Oct 15, 7:05 AM PT.",
    unavailable: "kylevb.com had a problem. Showing air times saved Oct 15, 7:05 AM PT.",
    resting: {
      kind: "Report",
      title: "Countdowns are resting",
      text: "Those episodes have aired. New ones appear when AniList and this widget refresh.",
      inline: "Countdowns are resting",
    },
  };

  it("is the card's words, the schedule banner's and the state's line, for every state", () => {
    expect(widgetCopy("Kyle", "rows", NOW)).toEqual({ ...base, state: null });
    expect(widgetCopy("Kyle", "resting", NOW)).toEqual({ ...base, state: null });
    expect(widgetCopy("Kyle", "nothing-scheduled", NOW)).toEqual({
      ...base,
      state: {
        kind: "Report",
        title: "Nothing on Kyle's airing schedule",
        text: "Completed and dropped shows stay out of the way.",
        inline: "Nothing on Kyle's airing schedule",
      },
    });
    expect(widgetCopy("Kyle", "empty-list", NOW)).toEqual({
      ...base,
      state: {
        kind: "Report",
        title: "Kyle hasn't added any anime yet",
        text: "Recommend: predation.",
        inline: "Kyle hasn't added any anime yet",
      },
    });
  });

  it("keeps the no-payload lines word for word", () => {
    expect(WIDGET_FALLBACK_COPY).toEqual({
      setup: {
        kind: "Notice",
        title: "Link your list",
        text: "Tap here to paste your list link, or put it in this widget's Parameter field.",
        inline: "kylevb: link your list",
      },
      badLink: {
        kind: "Warning",
        title: "That isn't a list link",
        text: "Check this widget's Parameter: touch and hold it, then Edit Widget.",
        inline: "kylevb: check the Parameter",
      },
      notFound: {
        kind: "Warning",
        title: "No list at that link",
        text: "kylevb.com found no list at that link. Copy it again from your Airing Schedule.",
        inline: "kylevb: no list at that link",
      },
      notFoundParam: {
        kind: "Warning",
        title: "No list at that link",
        text: "Check this widget's Parameter: touch and hold it, then Edit Widget.",
        inline: "kylevb: no list at that link",
      },
      unreachable: {
        kind: "Report",
        title: "Couldn't reach kylevb.com",
        text: "Your schedule appears after the next successful refresh. Tap to try again.",
        inline: "Couldn't reach kylevb.com",
      },
      unavailable: {
        kind: "Report",
        title: "kylevb.com had a problem",
        text: "Your schedule appears after the next successful refresh. Tap to try again.",
        inline: "kylevb.com had a problem",
      },
      outdated: {
        kind: "Warning",
        title: "Update this widget",
        text: "kylevb.com no longer supports this version. Paste the new one from GitHub.",
        inline: "kylevb: update the widget",
      },
      error: {
        kind: "Warning",
        title: "This widget hit an error",
        text: "Tap to try again. The script's Diagnostics shows what went wrong.",
        inline: "kylevb widget error",
      },
    });
  });
});

describe("the truth sweep: every widget line stays true however late iOS redraws it", () => {
  const RELATIVE = /\b(today|tomorrow|yesterday|now|just|soon|currently|ago|left|offline)\b/i;
  // The card's panel names ("Next episodes", "Next up") are names, not claims about the moment.
  const PANEL_NAMES = new Set(["Next episodes", "Next up"]);
  const lineTexts = (line: WidgetLine | null) => (line ? [line.title, line.text ?? "", line.inline] : []);
  const names = ["Kyle", "Anonymous", "Maximiliano-Alejan"];
  const lines = [
    ...names.flatMap((name) =>
      (["rows", "resting", "nothing-scheduled", "empty-list"] as const).flatMap((state) => {
        const copy = widgetCopy(name, state, NOW);
        return [
          copy.eyebrow,
          copy.sage,
          copy.title,
          copy.header,
          copy.headerNote,
          copy.ticker,
          copy.footer,
          copy.aired,
          copy.savedNote,
          copy.offline,
          copy.unavailable,
          ...lineTexts(copy.resting),
          ...lineTexts(copy.state),
        ];
      })
    ),
    ...Object.values(WIDGET_FALLBACK_COPY).flatMap(lineTexts),
    widgetWhen(at("2026-10-22T17:00:00Z"), NOW).when,
  ];

  it("has no relative time words", () => {
    for (const line of lines) {
      if (PANEL_NAMES.has(line)) continue;
      expect(line, line).not.toMatch(RELATIVE);
      expect(line, line).not.toMatch(/\bin \d/);
    }
  });

  it("fits: ≤ 90 characters a line, state lines ≤ 80 (two lines of the medium body), fallback titles ≤ 34", () => {
    for (const line of lines) expect(Array.from(line).length, line).toBeLessThanOrEqual(90);
    for (const line of [...Object.values(WIDGET_FALLBACK_COPY), WIDGET_RESTING]) {
      expect(Array.from(line.text ?? "").length, line.text ?? "").toBeLessThanOrEqual(80);
      expect(Array.from(line.title).length, line.title).toBeLessThanOrEqual(34);
    }
    expect(RESTING_LINE.length).toBeLessThanOrEqual(80);
  });

  it("tells its one joke on the empty-list screen only", () => {
    const joke = /predation/i;
    expect(widgetStateLine("empty-list", "Kyle")?.text).toMatch(joke);
    for (const state of ["rows", "resting", "nothing-scheduled"] as const) {
      expect(JSON.stringify(widgetCopy("Kyle", state, NOW))).not.toMatch(joke);
    }
    expect(JSON.stringify(WIDGET_FALLBACK_COPY)).not.toMatch(joke);
  });
});

describe("the large widget's Sage line fits two lines on the narrowest large widget", () => {
  // The large widget's width (the script's size tables: every phone and iPad) − 24 (padding) − 16 (box padding)
  // − 2 (border) − the 《Notice》 tag (6 SF Mono letters + 2 full-width brackets at 11 pt ≈ 62.8 pt) − 4 − 8 (a
  // flexible spacer's possible minimum); SF Mono is 1266/2048 em, at the sentence's 0.75 floor ≈ 5.10 pt a column.
  // The narrowest is 305.5 pt (iPad mini, 768 × 1024 iPads): 37 columns a line. Wrapped greedily by words (a break
  // after a space or a hyphen), as Text does.
  const SF_MONO_EM = 1266 / 2048;
  let PER_LINE = 0;
  beforeAll(async () => {
    const S = (await scriptExports()) as { SIZES: number[][]; IPAD_SIZES: number[][] };
    const narrowest = Math.min(...[...S.SIZES, ...S.IPAD_SIZES].map((row) => row[3]));
    const tag = 11 * (6 * SF_MONO_EM + 2);
    PER_LINE = Math.floor((narrowest - 24 - 16 - 2 - tag - 4 - 8) / (11 * SF_MONO_EM * 0.75));
  });
  function lines(text: string): number {
    const words = text.split(/(?<=[ -])/);
    let count = 1;
    let width = 0;
    for (const word of words) {
      const w = Array.from(word.trimEnd()).length;
      if (width && width + w > PER_LINE) {
        count += 1;
        width = 0;
      }
      width += Array.from(word).length;
    }
    return count;
  }

  it("for every name up to SAGE_NAME_MAX graphemes, and says this list's past it", () => {
    for (let n = 1; n <= SAGE_NAME_MAX; n += 1) {
      for (const name of ["M".repeat(n), `${"M".repeat(Math.max(1, n - 1))}-`.slice(0, n)]) {
        const sage = widgetCopy(name, "rows", NOW).sage;
        expect(lines(sage), sage).toBeLessThanOrEqual(2);
      }
    }
    expect(widgetCopy("Maximiliano-Alejandro", "rows", NOW).sage).toBe("Thought Acceleration: this list's week, computed in Pacific Time.");
    expect(widgetCopy(clipGraphemes("Maximiliano-Alejandro", 20), "rows", NOW).sage).toContain("this list's week");
    expect(lines(widgetCopy("Maximiliano-Alejandro", "rows", NOW).sage)).toBeLessThanOrEqual(2);
    // A column to spare at the limit; the check itself can fail: a name that fills line 1 pushes "Pacific Time." to a
    // third line.
    expect(PER_LINE).toBe(37);
    expect(Array.from(`Thought Acceleration: ${"M".repeat(SAGE_NAME_MAX)}'s`).length).toBeLessThanOrEqual(PER_LINE - 1);
    expect(lines(`Thought Acceleration: ${"M".repeat(PER_LINE - 23)}'s week, computed in Pacific Time.`)).toBe(3);
    expect(widgetCopy("M".repeat(SAGE_NAME_MAX + 1), "rows", NOW).sage).toContain("this list's week");
    // Measured in monospaced columns: CJK, kana and emoji are two wide.
    expect(sageColumns("\u4f50\u85e4\u82b1\u5b50")).toBe(8);
    expect(widgetCopy("\u4f50\u85e4\u82b1\u5b50", "rows", NOW).sage).toContain("\u4f50\u85e4\u82b1\u5b50's week");
    for (const wide of ["\u3042".repeat(7), "Christopher\u{1F525}", "Alexander\u{1F338}\u{1F338}"]) {
      expect(sageColumns(wide), wide).toBeGreaterThan(SAGE_NAME_MAX);
      expect(widgetCopy(wide, "rows", NOW).sage, wide).toContain("this list's week");
    }
    expect(widgetCopy("Maximilianoalejandro", "rows", NOW).sage).toContain("this list's week");
  });

  it("keeps the saved-copy lines within two lines too", () => {
    // The widest stamps: a two-digit day and a 10–12 o'clock time ("Dec 12, 12:59 PM PT").
    const widest = [Date.parse("2026-12-31T07:59:00Z"), Date.parse("2026-10-15T17:05:00Z"), Date.parse("2026-12-12T20:59:00Z")];
    for (const ms of [NOW, Date.parse("2026-11-01T08:30:00Z"), ...widest]) {
      expect(lines(offlineLine(ms))).toBeLessThanOrEqual(2);
      expect(lines(unavailableLine(ms))).toBeLessThanOrEqual(2);
    }
  });
});
