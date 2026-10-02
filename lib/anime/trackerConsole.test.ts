import { describe, expect, it } from "vitest";
import { editMessage, plusOneMessage, PROMPT_MESSAGE, scoreMessage, statusMessage } from "./trackerConsole";
import type { UserAnimeData } from "./types";

const day = Date.UTC(2026, 3, 3);
const data = (overrides: Partial<UserAnimeData> = {}): UserAnimeData => ({
  listType: "watching",
  episodeProgressNumber: 22,
  startDate: day,
  finishDate: null,
  score: null,
  ...overrides,
});

describe("tracker console lines", () => {
  it("keeps the landing demo's wording word for word", () => {
    expect(PROMPT_MESSAGE.text).toBe("Watched the next one? Tap +1.");
    expect(plusOneMessage({ prev: data(), next: data({ episodeProgressNumber: 23 }), episodes: 24 }).text).toBe(
      "Episode 23 logged. 1 to go."
    );
    expect(
      plusOneMessage({
        prev: data({ episodeProgressNumber: 23 }),
        next: data({ listType: "completed", episodeProgressNumber: 24, finishDate: day }),
        episodes: 24,
      }).text
    ).toBe("Final episode reached. Moved to Completed. Finish date set to today.");
    expect(statusMessage(data({ listType: "completed" }), data({ listType: "watching" })).text).toBe(
      "Status set to Watching. Rewatching? Progress stays at 22."
    );
    expect(statusMessage(data(), data({ listType: "paused" })).text).toBe("Status set to Paused.");
    expect(scoreMessage(data({ score: 8.5 })).text).toBe("Score recorded: 8.5 / 10.");
    expect(scoreMessage(data({ score: 8.5 })).spoken).toBe("Score recorded: 8.5 out of 10.");
    expect(scoreMessage(data()).text).toBe("Score cleared.");
  });

  it("names the show on My List and handles unknown totals", () => {
    expect(
      plusOneMessage({ prev: data({ episodeProgressNumber: 1212 }), next: data({ episodeProgressNumber: 1213 }), episodes: null, title: "Detective Conan" }).text
    ).toBe("Episode 1213 logged for Detective Conan.");
    expect(
      plusOneMessage({ prev: data({ episodeProgressNumber: 11 }), next: data({ episodeProgressNumber: 12 }), episodes: 0, title: "X" }).text
    ).toBe("Episode 12 logged for X.");
  });

  it("only claims a finish date the server actually set", () => {
    const prev = data({ episodeProgressNumber: 11, finishDate: Date.UTC(2026, 0, 1) });
    const next = data({ listType: "completed", episodeProgressNumber: 12, finishDate: Date.UTC(2026, 0, 1) });
    expect(plusOneMessage({ prev, next, episodes: 12, title: "Frieren" }).text).toBe(
      "Final episode reached. Frieren moved to Completed."
    );
  });

  it("says when a +1 starts or resumes a show", () => {
    expect(
      plusOneMessage({ prev: data({ listType: "planning", episodeProgressNumber: 0 }), next: data({ episodeProgressNumber: 1 }), episodes: 24, title: "Red River" }).text
    ).toBe("Episode 1 logged. Red River moved to Watching.");
    expect(
      plusOneMessage({ prev: data({ listType: "paused" }), next: data({ episodeProgressNumber: 23 }), episodes: 24 }).text
    ).toBe("Episode 23 logged. Moved to Watching.");
  });

  it("says caught up when the last aired episode is logged", () => {
    expect(
      plusOneMessage({ prev: data(), next: data({ episodeProgressNumber: 23 }), episodes: 24, unlogged: { before: 1, after: 0 } }).text
    ).toBe("Episode 23 logged. Caught up.");
    // Nothing was waiting: the usual line.
    expect(
      plusOneMessage({ prev: data(), next: data({ episodeProgressNumber: 23 }), episodes: 24, unlogged: { before: 0, after: 0 } }).text
    ).toBe("Episode 23 logged. 1 to go.");
  });

  it("picks one line for an edit, most important change first", () => {
    const prev = data();
    // `sent` = what the form submitted (the dialog always sends every field).
    const edit = (sent: Partial<UserAnimeData>, saved: Partial<UserAnimeData> = sent) =>
      editMessage({ prev, sent: data(sent), next: data(saved), episodes: 24 });
    expect(edit({ listType: "paused", score: 7 }).text).toBe("Status set to Paused.");
    // Progress typed to the finale: the server completed it and filled the date.
    expect(
      edit({ episodeProgressNumber: 24 }, { listType: "completed", episodeProgressNumber: 24, finishDate: day }).text
    ).toBe("Final episode reached. Moved to Completed. Finish date set to today.");
    expect(edit({ episodeProgressNumber: 20 }).spoken).toBe("Progress set to 20 of 24.");
    expect(edit({ score: 9 }).text).toBe("Score recorded: 9 / 10.");
    expect(edit({ startDate: day + 86_400_000 }).text).toBe("Dates updated.");
    expect(edit({}).text).toBe("Saved. Nothing changed.");
  });

  it("never misreports a choice the user made or a date they typed", () => {
    const prev = data({ episodeProgressNumber: 5 });
    const typed = Date.UTC(2026, 8, 20);
    // Completed chosen with a typed finish date: the server fills progress, keeps the date.
    expect(
      editMessage({
        prev,
        sent: data({ listType: "completed", episodeProgressNumber: 5, finishDate: typed }),
        next: data({ listType: "completed", episodeProgressNumber: 24, finishDate: typed }),
        episodes: 24,
      }).text
    ).toBe("Status set to Completed.");
    // Completed chosen with no date: the server sets today.
    expect(
      editMessage({
        prev,
        sent: data({ listType: "completed", episodeProgressNumber: 5 }),
        next: data({ listType: "completed", episodeProgressNumber: 24, finishDate: day }),
        episodes: 24,
      }).text
    ).toBe("Status set to Completed. Finish date set to today.");
    // Progress typed to the finale together with a past finish date.
    expect(
      editMessage({
        prev,
        sent: data({ episodeProgressNumber: 24, finishDate: typed }),
        next: data({ listType: "completed", episodeProgressNumber: 24, finishDate: typed }),
        episodes: 24,
      }).text
    ).toBe("Final episode reached. Moved to Completed.");
    // Rewatch from zero: progress didn't "stay".
    const done = data({ listType: "completed", episodeProgressNumber: 12, finishDate: day });
    expect(
      editMessage({
        prev: done,
        sent: data({ listType: "watching", episodeProgressNumber: 0, finishDate: day }),
        next: data({ listType: "watching", episodeProgressNumber: 0, finishDate: day }),
        episodes: 12,
      }).text
    ).toBe("Status set to Watching. Rewatching? Progress set to 0.");
  });

  it("doesn't say \"0 to go\" when a dropped show reaches its last episode", () => {
    expect(
      plusOneMessage({
        prev: data({ listType: "dropped", episodeProgressNumber: 23 }),
        next: data({ listType: "dropped", episodeProgressNumber: 24 }),
        episodes: 24,
      }).text
    ).toBe("Episode 24 logged. That's every episode.");
  });
});
