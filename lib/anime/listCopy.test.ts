import { describe, expect, it } from "vitest";
import {
  COUNTDOWNS_RESTING,
  NEXT_EPISODES_NOTE,
  NEXT_EPISODES_TITLE,
  NEXT_UP_LABEL,
  PREDATION_LINE,
  SCHEDULE_SKIPS_LINE,
  WHOLE_WEEK_LABEL,
  listEmptyBody,
  listStats,
  listTitle,
  listVisitorLine,
  listVisitorSub,
  noAnimeYetTitle,
  nothingAiringTitle,
  publicOwnerName,
  scheduleStandingLine,
  scheduleSub,
  scheduleTitle,
} from "./listCopy";
import type { ListStatus } from "./types";

const entry = (status: string, listType: ListStatus, episodeProgressNumber: number, score: number | null) => ({
  status,
  userData: { listType, episodeProgressNumber, score, startDate: null, finishDate: null },
});

describe("listStats", () => {
  it("counts the banner's readout", () => {
    const entries = [
      entry("RELEASING", "watching", 10, 8),
      entry("RELEASING", "watching", 5, null),
      entry("NOT_YET_RELEASED", "planning", 0, null),
      entry("FINISHED", "completed", 12, 9.5),
      entry("RELEASING", "dropped", 3, null),
    ];
    expect(listStats(entries)).toEqual({ shows: 5, watching: 2, episodes: 30, meanScore: "8.8", releasing: 3 });
    expect(listStats([entry("FINISHED", "completed", 1, null)]).meanScore).toBeNull();
  });
});

describe("visitor lines", () => {
  it("names the owner by first name", () => {
    expect(publicOwnerName("  Kyle  Bautista ")).toBe("Kyle");
    expect(publicOwnerName("Kyle\tBautista")).toBe("Kyle");
    expect(publicOwnerName("Kyle\u0085Bautista")).toBe("Kyle");
    expect(publicOwnerName("")).toBeNull();
    expect(publicOwnerName(null)).toBeNull();
    // Invisible format characters never reach a page, a share image or the widget.
    expect(publicOwnerName("\u202EKyle Bautista")).toBe("Kyle");
    expect(publicOwnerName("\u2066Kyle\u2069")).toBe("Kyle");
    expect(publicOwnerName("\u200B\u200F")).toBeNull();
    // Each character INVISIBLE_FORMAT strips, inside and around a word.
    const stripped = [
      "\u00AD", "\u034F", "\u061C", "\u115F", "\u1160", "\u17B4", "\u17B5", "\u180E", "\u200B", "\u200E", "\u200F",
      "\u202A", "\u202B", "\u202C", "\u202D", "\u202E", "\u2060", "\u2061", "\u2062", "\u2063", "\u2064", "\u2066",
      "\u2067", "\u2068", "\u2069", "\u206A", "\u206B", "\u206C", "\u206D", "\u206E", "\u206F", "\u3164", "\uFEFF", "\uFFA0",
    ];
    for (const c of stripped) {
      expect(publicOwnerName(`Ky${c}le Bautista`), JSON.stringify(c)).toBe("Kyle");
      expect(publicOwnerName(`${c}Kyle${c}`), JSON.stringify(c)).toBe("Kyle");
    }
    // A first word with nothing drawn (a blanked first name, a lone ZWJ, a tag, a control) is no name, never the
    // next word, which is usually the family name.
    for (const blank of ["\u2060", "\u3164", "\uFFA0", "\u00AD", "\u200D", "\u{E0001}", "\u2800", "\u115F\u1160", "\u0001", "\uFFF9", "\u{1D159}"]) {
      expect(publicOwnerName(blank), JSON.stringify(blank)).toBeNull();
      expect(publicOwnerName(`${blank} Bautista`), JSON.stringify(blank)).toBeNull();
    }
    // ZWJ, variation selectors and tags stay: emoji sequences and flags need them.
    expect(publicOwnerName("Kyle\u200D")).toBe("Kyle\u200D");
    expect(publicOwnerName("\u{1F469}\u200D\u{1F4BB} Kyle")).toBe("\u{1F469}\u200D\u{1F4BB}");
    expect(publicOwnerName("\u2764\uFE0F")).toBe("\u2764\uFE0F");
    const england = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
    expect(publicOwnerName(`${england} Kyle`)).toBe(england);
  });

  it("matches the pages word for word", () => {
    expect(listVisitorLine("Kyle", { shows: 17, releasing: 12 }).text).toBe(
      "Analysis complete: 17 shows on Kyle's list, 12 still airing."
    );
    expect(listVisitorLine("Kyle", { shows: 1, releasing: 1 }).text).toBe(
      "Analysis complete: 1 show on Kyle's list, 1 still airing."
    );
    expect(listVisitorLine("Kyle", { shows: 0, releasing: 0 }).text).toBe("Kyle hasn't stored any shows yet.");
    expect(listVisitorLine(null, { shows: 3, releasing: 1 }).text).toBe(
      "Analysis complete: 3 shows on this list, 1 still airing."
    );
    expect(listVisitorLine(null, { shows: 0, releasing: 0 }).text).toBe("This list has no shows yet.");
    expect(listVisitorSub("Kyle")).toBe("What Kyle is watching, planning and has finished. Only Kyle can edit it.");
    expect(listVisitorSub(null)).toBe("What its owner is watching, planning and has finished. Only its owner can edit it.");
    expect(listEmptyBody("Eli")).toBe("Eli hasn't added any anime to their list.");
    expect(scheduleStandingLine("Kyle's")).toBe("Thought Acceleration: Kyle's week, computed in Pacific Time.");
    expect(scheduleSub(0)).toBe("Every show on the list with an upcoming episode, lined up by the day it airs.");
    expect(scheduleSub(1)).toBe(
      "1 show with an upcoming episode, lined up by the day it airs. Completed and dropped shows stay out of the way."
    );
    expect(scheduleSub(11).startsWith("11 shows with an upcoming episode")).toBe(true);
    expect(noAnimeYetTitle("Eli")).toBe("Eli hasn't added any anime yet");
    expect(nothingAiringTitle("Eli's list")).toBe("Nothing on Eli's list is airing right now");
    expect(listTitle(null)).toBe("Anime list");
    expect(scheduleTitle(null)).toBe("Airing schedule");
  });
});

describe("the Next-episodes card's words (the card, the hero and the iPhone widget)", () => {
  it("keep the card's literals", () => {
    expect(NEXT_EPISODES_TITLE).toBe("Next episodes");
    expect(NEXT_EPISODES_NOTE).toBe("Pacific Time");
    expect(NEXT_UP_LABEL).toBe("Next up");
    expect(WHOLE_WEEK_LABEL).toBe("The whole week");
    expect(COUNTDOWNS_RESTING).toBe("Countdowns are resting");
    expect(PREDATION_LINE).toBe("Recommend: predation.");
    expect(SCHEDULE_SKIPS_LINE).toBe("Completed and dropped shows stay out of the way.");
    expect(scheduleSub(3)).toBe(
      "3 shows with an upcoming episode, lined up by the day it airs. Completed and dropped shows stay out of the way."
    );
  });
});
