import { describe, expect, it } from "vitest";
import { DEFAULT_USER_DATA } from "@/lib/anime/types";
import type { UserAnimeData } from "@/lib/anime/types";
import { dateInputToMs, formValuesFrom, msToDateInput, parseEditForm } from "./editForm";

const initial: UserAnimeData = {
  ...DEFAULT_USER_DATA,
  episodeProgressNumber: 3,
  // Auto-set by the server with a time of day (Oct 1 2026, 22:15 UTC).
  startDate: Date.UTC(2026, 9, 1, 22, 15),
  score: 8.5,
};

describe("date input conversion", () => {
  it("round-trips UTC calendar dates", () => {
    expect(msToDateInput(Date.UTC(2026, 9, 1, 22, 15))).toBe("2026-10-01");
    expect(dateInputToMs("2026-10-01")).toBe(Date.UTC(2026, 9, 1));
    expect(msToDateInput(null)).toBe("");
    expect(msToDateInput(Number.NaN)).toBe("");
  });

  it("rejects malformed or impossible dates", () => {
    expect(dateInputToMs("")).toBeNull();
    expect(dateInputToMs("2026-02-31")).toBeNull();
    expect(dateInputToMs("10/01/2026")).toBeNull();
  });
});

describe("parseEditForm", () => {
  const values = formValuesFrom(initial);

  it("keeps untouched dates at their original timestamp", () => {
    const result = parseEditForm(values, { episodes: 12, initial });
    expect(result).toEqual({ ok: true, userData: initial });
  });

  it("converts edited dates to UTC midnight and empty fields to null", () => {
    const result = parseEditForm(
      { ...values, startDate: "2026-09-30", finishDate: "", score: "" },
      { episodes: 12, initial }
    );
    expect(result.ok && result.userData).toMatchObject({
      startDate: Date.UTC(2026, 8, 30),
      finishDate: null,
      score: null,
    });
  });

  it("requires a whole, non-negative progress within a known episode count", () => {
    for (const progress of ["", "  ", "-1", "2.5", "abc"]) {
      const result = parseEditForm({ ...values, progress }, { episodes: 12, initial });
      expect(result.ok ? null : result.errors.progress).toBeTruthy();
    }
    const tooMany = parseEditForm({ ...values, progress: "13" }, { episodes: 12, initial });
    expect(tooMany.ok ? null : tooMany.errors.progress).toBe("This show has 12 episodes.");
    // Unknown episode count: anything non-negative goes.
    expect(parseEditForm({ ...values, progress: "200" }, { episodes: null, initial }).ok).toBe(
      true
    );
  });

  it("validates and rounds the score", () => {
    const bad = parseEditForm({ ...values, score: "11" }, { episodes: 12, initial });
    expect(bad.ok ? null : bad.errors.score).toBeTruthy();
    const rounded = parseEditForm({ ...values, score: "7.25" }, { episodes: 12, initial });
    expect(rounded.ok && rounded.userData.score).toBe(7.3);
  });

  it("rejects a finish date before the start date", () => {
    const result = parseEditForm(
      { ...values, startDate: "2026-10-05", finishDate: "2026-10-01" },
      { episodes: 12, initial }
    );
    expect(result.ok ? null : result.errors.finishDate).toBeTruthy();
  });
});
