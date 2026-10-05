import { describe, expect, it } from "vitest";
import {
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
    expect(publicOwnerName("")).toBeNull();
    expect(publicOwnerName(null)).toBeNull();
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
