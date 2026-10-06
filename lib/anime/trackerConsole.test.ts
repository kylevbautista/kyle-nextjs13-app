import { describe, expect, it } from "vitest";
import { formatAirDate } from "./airing";
import {
  burstMessage,
  cappedPlusOneLabel,
  catchUpLabel,
  editMessage,
  failedMessage,
  noChangeMessage,
  notAiredMessage,
  plusOneMessage,
  PROMPT_MESSAGE,
  scoreMessage,
  staleMessage,
  statusMessage,
  undoLabel,
  undoMessage,
  undoTitle,
} from "./trackerConsole";
import { LIST_STATUSES } from "./types";
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
    expect(plusOneMessage({ prev: data(), next: data({ episodeProgressNumber: 23 }), episodes: 24, caughtUp: true }).text).toBe(
      "Episode 23 logged. Caught up."
    );
    // Not known to be caught up: the usual line.
    expect(plusOneMessage({ prev: data(), next: data({ episodeProgressNumber: 23 }), episodes: 24 }).text).toBe(
      "Episode 23 logged. 1 to go."
    );
    // Every branch: a Plan to Watch show started, and a long runner.
    expect(
      plusOneMessage({
        prev: data({ listType: "planning", episodeProgressNumber: 0 }),
        next: data({ episodeProgressNumber: 1 }),
        episodes: 12,
        title: "Red River",
        caughtUp: true,
      }).text
    ).toBe("Episode 1 logged. Red River moved to Watching. Caught up.");
    expect(
      plusOneMessage({ prev: data({ episodeProgressNumber: 1353 }), next: data({ episodeProgressNumber: 1355 }), episodes: null, title: "Shin Chan", caughtUp: true }).spoken
    ).toBe("Episodes 1354 and 1355 logged for Shin Chan. Caught up.");
    // At the last episode (a Dropped show isn't completed), "That's every episode." says more.
    expect(
      plusOneMessage({ prev: data({ listType: "dropped", episodeProgressNumber: 23 }), next: data({ listType: "dropped", episodeProgressNumber: 24 }), episodes: 24, caughtUp: true }).text
    ).toBe("Episode 24 logged. That's every episode.");
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

describe("burst lines", () => {
  const p = (episodeProgressNumber: number, overrides: Partial<UserAnimeData> = {}) =>
    data({ episodeProgressNumber, ...overrides });

  it("names a range of episodes, spoken without the dash", () => {
    const two = plusOneMessage({ prev: p(11), next: p(13), episodes: 24, title: "Frieren" });
    expect(two.text).toBe("Episodes 12–13 logged for Frieren. 11 to go.");
    expect(two.spoken).toBe("Episodes 12 and 13 logged for Frieren. 11 to go.");
    const three = plusOneMessage({ prev: p(11), next: p(14), episodes: 24, title: "Frieren" });
    expect(three.spoken).toBe("Episodes 12 to 14 logged for Frieren. 10 to go.");
    expect(plusOneMessage({ prev: p(1353), next: p(1355), episodes: null, title: "Shin Chan" }).text).toBe(
      "Episodes 1354–1355 logged for Shin Chan."
    );
    expect(
      plusOneMessage({ prev: p(0, { listType: "planning" }), next: p(2), episodes: 24, title: "Red River" }).text
    ).toBe("Episodes 1–2 logged. Red River moved to Watching.");
    // A range that reaches the finale is the finale line.
    expect(
      plusOneMessage({ prev: p(20), next: p(24, { listType: "completed", finishDate: day }), episodes: 24, title: "Frieren" }).text
    ).toBe("Final episode reached. Frieren moved to Completed. Finish date set to today.");
  });

  it("picks the finale, then stale, then nothing logged, then the range", () => {
    const done = p(24, { listType: "completed", finishDate: day + 1 });
    const exact = (aired: number) => ({ aired, exact: true });
    const behind = (aired: number) => ({ aired, exact: false });
    expect(burstMessage({ first: p(22), last: done, stale: true, episodes: 24, aired: exact(24) }).text).toBe(
      "Final episode reached. Moved to Completed. Finish date set to today."
    );
    expect(burstMessage({ first: p(12), last: p(13), stale: true, episodes: 24, title: "Frieren", aired: exact(13) }).text).toBe(
      "Episode 13 logged for Frieren. It had changed since this page last checked: now Ep 13 / 24."
    );
    // Nothing logged, read against the airing fields the server sent back.
    expect(burstMessage({ first: p(7), last: p(7), stale: false, episodes: 12, title: "X", aired: exact(7) }).text).toBe(
      "Nothing logged: no new episode has aired yet. X is at Ep 7 / 12."
    );
    expect(burstMessage({ first: p(7), last: p(7), stale: false, episodes: 12, title: "X", aired: behind(7) }).text).toBe(
      "Nothing logged: caught up on X as far as this page knows. Reload to check."
    );
    // No airing fields came back (an older server): below the last episode, only the aired count stops it.
    expect(burstMessage({ first: p(7), last: p(7), stale: false, episodes: 12, title: "X", aired: null }).text).toBe(
      "Nothing logged: no new episode has aired yet. X is at Ep 7 / 12."
    );
    expect(burstMessage({ first: p(12), last: p(12), stale: false, episodes: 12, title: "X", aired: exact(12) }).text).toBe(
      "Nothing logged: X is already at Ep 12 / 12."
    );
    expect(burstMessage({ first: p(5), last: p(7), stale: false, episodes: 12, title: "X", aired: exact(9) }).text).toBe(
      "Episodes 6–7 logged for X. 5 to go."
    );
    expect(
      burstMessage({ first: p(1212), last: p(1215), stale: false, episodes: null, title: "Detective Conan", aired: exact(1215) })
        .spoken
    ).toBe("Episodes 1213 to 1215 logged for Detective Conan. Caught up.");
    // Past the schedule's horizon "caught up" is only as far as the page knows: no claim.
    expect(burstMessage({ first: p(13), last: p(14), stale: false, episodes: 26, title: "Knight", aired: behind(14) }).text).toBe(
      "Episode 14 logged for Knight. 12 to go."
    );
  });

  it("says a stale save plainly", () => {
    expect(staleMessage({ first: p(1355), last: p(1356), episodes: null, title: "Shin Chan" }).text).toBe(
      "Episode 1356 logged for Shin Chan. It had changed since this page last checked: now Ep 1356."
    );
    const two = staleMessage({ first: p(11), last: p(13), episodes: 24, title: "Frieren" });
    expect(two.text).toBe("Episodes 12–13 logged for Frieren. It had changed since this page last checked: now Ep 13 / 24.");
    expect(two.spoken).toBe(
      "Episodes 12 and 13 logged for Frieren. It had changed since this page last checked: now episode 13 of 24."
    );
    expect(staleMessage({ first: p(10), last: p(13), episodes: 24 }).spoken).toBe(
      "Episodes 11 to 13 logged. It had changed since this page last checked: now episode 13 of 24."
    );
    expect(staleMessage({ first: p(24), last: p(24), episodes: 24, title: "Frieren" }).text).toBe(
      "Nothing logged for Frieren. It had changed since this page last checked: now Ep 24 / 24."
    );
  });

  it("says what nothing-logged means", () => {
    expect(noChangeMessage({ current: p(1214), episodes: null, title: "Detective Conan", why: "notAired" }).spoken).toBe(
      "Nothing logged: no new episode has aired yet. Detective Conan is at episode 1214."
    );
    expect(noChangeMessage({ current: p(24), episodes: 24, why: "already" }).text).toBe(
      "Nothing logged: it is already at Ep 24 / 24."
    );
    expect(noChangeMessage({ current: p(14), episodes: 26, why: "pageBehind" }).text).toBe(
      "Nothing logged: caught up as far as this page knows. Reload to check."
    );
    expect(noChangeMessage({ current: p(14), episodes: 26, title: "Knight", why: "serverBehind" }).spoken).toBe(
      "Nothing logged: the server doesn't count a new episode as aired yet. Knight is at episode 14 of 26."
    );
  });
});

describe("refused +1 lines and the capped button", () => {
  // Thu Oct 8 2026 16:30 UTC = 9:30 AM PDT
  const AT = Date.UTC(2026, 9, 8, 16, 30) / 1000;
  const date = formatAirDate(AT);
  const cap = (progress: number, aired: number, episode = aired + 1) => ({ progress, aired, next: { episode, airingAt: AT } });

  it("says why nothing was logged, caught up first", () => {
    expect(date).toBe("Oct 8, 2026, 9:30 AM PDT");
    expect(notAiredMessage({ cap: cap(14, 14), title: "Knight" })).toEqual({
      kind: "Notice",
      text: "Nothing logged: caught up on Knight. Episode 15 airs Oct 8, 2026, 9:30 AM PDT. Watched it early? Use Edit.",
      spoken: "Nothing logged: caught up on Knight. Episode 15 airs Oct 8, 2026, 9:30 AM PDT. Watched it early? Use Edit.",
    });
    expect(notAiredMessage({ cap: cap(0, 0), title: "Knight" }).text).toBe("Nothing logged: Knight premieres Oct 8, 2026, 9:30 AM PDT.");
    // A second cour numbered from 13 that hasn't premiered.
    expect(notAiredMessage({ cap: cap(0, 0, 13), title: "Knight" }).text).toBe(
      "Nothing logged: Knight premieres Oct 8, 2026, 9:30 AM PDT."
    );
    expect(notAiredMessage({ cap: cap(16, 14), title: "Knight" }).text).toBe(
      "Nothing logged: episode 17 of Knight hasn't aired yet. Watched it early? Use Edit."
    );
    // Logged ahead before the premiere.
    expect(notAiredMessage({ cap: cap(2, 0), title: "Knight" }).text).toBe(
      "Nothing logged: episode 3 of Knight hasn't aired yet. Watched it early? Use Edit."
    );
  });

  it("leaves the Edit hint out without a title (the demo has no Edit)", () => {
    expect(notAiredMessage({ cap: cap(14, 14) }).text).toBe("Nothing logged: caught up. Episode 15 airs Oct 8, 2026, 9:30 AM PDT.");
    expect(notAiredMessage({ cap: cap(0, 0) }).text).toBe("Nothing logged: it premieres Oct 8, 2026, 9:30 AM PDT.");
    expect(notAiredMessage({ cap: cap(16, 14) }).text).toBe("Nothing logged: episode 17 hasn't aired yet.");
  });

  it("names the capped button like the enabled one, with the state in its tooltip", () => {
    expect(cappedPlusOneLabel({ cap: cap(14, 14), title: "Knight" })).toEqual({
      label: "+1: caught up on Knight. Episode 15 airs Oct 8, 2026, 9:30 AM PDT",
      title: "Caught up. Watched it early? Use Edit.",
    });
    expect(cappedPlusOneLabel({ cap: cap(0, 0), title: "Knight" })).toEqual({
      label: "+1: Knight premieres Oct 8, 2026, 9:30 AM PDT",
      title: "Not aired yet. Watched it early? Use Edit.",
    });
    expect(cappedPlusOneLabel({ cap: cap(16, 14), title: "Knight" })).toEqual({
      label: "+1: episode 17 of Knight hasn't aired yet",
      title: "Logged ahead of the schedule. Watched it early? Use Edit.",
    });
  });

  it("stays short and speakable for every capped state", () => {
    const TITLE = "Frierenfrier"; // 12 characters
    for (const [progress, aired, episode] of [
      [0, 0, 1],
      [0, 0, 13],
      [3, 0, 1],
      [9, 9, 10],
      [12, 9, 10],
      [1214, 1214, 1215],
      [1300, 1214, 1215],
    ]) {
      for (const title of [TITLE, undefined]) {
        const m = notAiredMessage({ cap: cap(progress, aired, episode), title });
        const label = `${progress}/${aired} next ${episode} ${title ?? "demo"}`;
        expect(m.text, label).toMatch(/^Nothing logged: /);
        expect(m.text.length, label).toBeLessThanOrEqual(120);
        expect(m.spoken, label).not.toMatch(/[/–]|\bEP\b/);
        expect(m.text.includes("Use Edit"), label).toBe(title !== undefined && !(progress === 0 && aired === 0));
        // Only an episode that hasn't aired is named as not aired.
        if (progress > aired) expect(m.text, label).toContain(`episode ${progress + 1}`);
        else if (aired > 0) expect(m.text, label).toContain(`Episode ${episode} airs`);
        else expect(m.text, label).toContain("premieres");
        if (title) expect(cappedPlusOneLabel({ cap: cap(progress, aired, episode), title }).label, label).toMatch(/^\+1: /);
      }
    }
  });
});

describe("undo lines", () => {
  const watching = (episodeProgressNumber: number, overrides: Partial<UserAnimeData> = {}) =>
    data({ episodeProgressNumber, ...overrides });
  const completed = data({ listType: "completed", episodeProgressNumber: 24, finishDate: day + 1 });
  const planned = data({ listType: "planning", episodeProgressNumber: 0, startDate: null });

  it("says where the show is back to", () => {
    const same = undoMessage({ from: watching(15), restored: watching(13), episodes: 24, title: "Frieren" });
    expect(same.text).toBe("Undone. Frieren is back to Ep 13 / 24.");
    expect(same.spoken).toBe("Undone. Frieren is back to episode 13 of 24.");
    expect(undoMessage({ from: completed, restored: watching(23), episodes: 24, title: "Frieren" }).text).toBe(
      "Undone. Frieren is back in Watching at Ep 23 / 24. Finish date cleared."
    );
    expect(undoMessage({ from: watching(1), restored: planned, episodes: 24, title: "Red River" }).text).toBe(
      "Undone. Red River is back in Plan to Watch, no episodes logged. Start date cleared."
    );
    expect(
      undoMessage({
        from: data({ listType: "completed", episodeProgressNumber: 1, finishDate: day }),
        restored: planned,
        episodes: 1,
      }).text
    ).toBe("Undone. Back in Plan to Watch, no episodes logged. Dates cleared.");
    expect(undoMessage({ from: completed, restored: watching(22), episodes: 24 }).text).toBe(
      "Undone. Back in Watching at Ep 22 / 24. Finish date cleared."
    );
    expect(undoMessage({ from: watching(24), restored: watching(22), episodes: 24 }).spoken).toBe(
      "Undone. Back to episode 22 of 24."
    );
    expect(undoMessage({ from: watching(1355), restored: watching(1353), episodes: null, title: "Shin Chan" }).text).toBe(
      "Undone. Shin Chan is back to Ep 1353."
    );
  });

  it("labels Undo with what it reverts", () => {
    expect(undoLabel({ n: 2, restore: watching(11), current: watching(13), episodes: 24, title: "Frieren" })).toBe(
      "Undo +2: put Frieren back to 11 of 24 episodes"
    );
    expect(undoLabel({ n: 1, restore: watching(23), current: completed, episodes: 24, title: "Ascendance of a Bookworm" })).toBe(
      "Undo +1: put Ascendance of a Bookworm back in Watching at 23 of 24 episodes"
    );
    expect(undoLabel({ n: 1, restore: planned, current: watching(1), episodes: 24, title: "Red River" })).toBe(
      "Undo +1: put Red River back in Plan to Watch, no episodes logged"
    );
    expect(undoLabel({ n: 2, restore: watching(1353), current: watching(1355), episodes: null, title: "Shin Chan" })).toBe(
      "Undo +2: put Shin Chan back to episode 1353"
    );
    expect(undoLabel({ n: 2, restore: watching(22), current: completed, episodes: 24, demo: true })).toBe(
      "Undo +2: back in Watching at 22 of 24 episodes (demo)"
    );
    expect(undoTitle({ restore: watching(11), current: watching(13), episodes: 24 })).toBe("Back to Ep 11 / 24");
    expect(undoTitle({ restore: watching(23), current: completed, episodes: 24 })).toBe("Back to Ep 23 / 24, Watching");
  });

  it("labels the catch-up chip with the exact episodes", () => {
    expect(catchUpLabel({ count: 1, from: 1213, title: "Detective Conan" })).toBe(
      "Log 1 new: mark episode 1213 of Detective Conan as watched"
    );
    expect(catchUpLabel({ count: 2, from: 1354, title: "Shin Chan" })).toBe(
      "Log 2 new: mark episodes 1354 and 1355 of Shin Chan as watched"
    );
    expect(catchUpLabel({ count: 3, from: 1213, title: "X" })).toBe("Log 3 new: mark episodes 1213 to 1215 of X as watched");
    expect(catchUpLabel({ count: 2, from: 23, title: "X", demo: true })).toBe(
      "Log 2 new: mark episodes 23 and 24 as watched (demo)"
    );
  });
});

describe("failure lines", () => {
  const at = data({ episodeProgressNumber: 11 });
  const nine = data({ episodeProgressNumber: 9 });
  const five = data({ episodeProgressNumber: 5 });

  it("says what failed and where the show is", () => {
    expect(
      failedMessage({ action: "save", outcome: "rejected", reason: "signedOut", current: at, episodes: 24, title: "Frieren" })
    ).toEqual({
      kind: "Warning",
      text: "Couldn't save: you're signed out. Frieren is at Ep 11 / 24.",
      spoken: "Couldn't save: you're signed out. Frieren is at episode 11 of 24.",
    });
    expect(
      failedMessage({ action: "undo", outcome: "rejected", reason: "changed", current: data({ episodeProgressNumber: 14 }), episodes: 24, title: "Frieren" }).text
    ).toBe("Couldn't undo: it had changed since this page last checked. Frieren is at Ep 14 / 24.");
    expect(failedMessage({ action: "save", outcome: "rejected", reason: "invalid", current: at, episodes: 24 }).text).toBe(
      "Couldn't save: the server refused it. It is at Ep 11 / 24."
    );
    for (const action of ["save", "undo"] as const) {
      expect(failedMessage({ action, outcome: "rejected", reason: "notOnList", current: null, episodes: 24, title: "Frieren" }).text).toBe(
        `Couldn't ${action}: Frieren isn't on your list anymore. Reload to update it.`
      );
    }
  });

  it("says when the outcome couldn't be known", () => {
    expect(failedMessage({ action: "save", outcome: "checked", current: nine, episodes: 24, title: "Frieren" }).spoken).toBe(
      "Couldn't confirm the save. Checked again: Frieren is at episode 9 of 24."
    );
    expect(failedMessage({ action: "undo", outcome: "checked", current: nine, episodes: 24, title: "Frieren" }).text).toBe(
      "Couldn't confirm the undo. Checked again: Frieren is at Ep 9 / 24."
    );
    expect(
      failedMessage({ action: "save", outcome: "checked", undoDropped: true, current: nine, episodes: 24, title: "Frieren" }).text
    ).toBe("Couldn't confirm the save, so Undo wasn't sent. Checked again: Frieren is at Ep 9 / 24.");
    expect(failedMessage({ action: "save", outcome: "unchecked", current: five, episodes: 24, title: "Frieren" }).text).toBe(
      "Couldn't confirm the save. Frieren was last confirmed at Ep 5 / 24. Reload to check."
    );
    expect(
      failedMessage({ action: "save", outcome: "unchecked", undoDropped: true, current: five, episodes: 24, title: "Frieren" }).spoken
    ).toBe("Couldn't confirm the save, so Undo wasn't sent. Frieren was last confirmed at episode 5 of 24. Reload to check.");
  });
});

describe("truth sweep: burst lines", () => {
  it("says exactly what each burst did, in at most 112 characters", () => {
    const TITLE = "Frierenfrier"; // 12 characters
    for (const total of [null, 12, 24]) {
      for (let from = 0; from <= 30; from += 3) {
        for (let to = from; to <= 30; to += 2) {
          if (total !== null && to > total) continue;
          for (const status of LIST_STATUSES) {
            const first = data({ listType: status, episodeProgressNumber: from });
            // What the rules allow: +1s move Plan to Watch / Paused to Watching; the finale completes.
            const moved = to > from && (status === "planning" || status === "paused") ? "watching" : status;
            const lastStatus =
              total !== null && to === total && from < total && (moved === "watching" || moved === "planning")
                ? "completed"
                : moved;
            const last = data({
              listType: lastStatus,
              episodeProgressNumber: to,
              finishDate: lastStatus === "completed" ? day : null,
            });
            for (const stale of [false, true]) {
              for (const aired of [null, { aired: to, exact: true }, { aired: to, exact: false }, { aired: to + 1, exact: true }]) {
                const m = burstMessage({ first, last, stale, episodes: total, title: TITLE, aired });
                const label = `${status} ${from}→${to}/${total} stale=${stale} aired=${JSON.stringify(aired)}`;
                const belowTotal = total === null || to < total;
                if (lastStatus === "completed" && status !== "completed") {
                  expect(m.text, label).toMatch(/^Final episode reached\./);
                } else if (to > from) {
                  const expectedRange = to - from === 1 ? `Episode ${to}` : `Episodes ${from + 1}–${to}`;
                  expect(m.text.startsWith(expectedRange), label).toBe(true);
                  expect(m.text.includes("It had changed since"), label).toBe(stale);
                  // Caught up only when the burst ended exactly on an exact aired count, below the last episode.
                  const caught = !stale && aired !== null && aired.exact && aired.aired === to && belowTotal;
                  expect(m.text.includes("Caught up"), label).toBe(caught);
                  if (!stale && !caught && moved === status && total !== null && to < total) {
                    expect(m.text, label).toContain(` ${total - to} to go.`);
                  }
                } else {
                  // Only the server's aired count stops a no-op below the last episode: say whose count.
                  const serverBehind = aired !== null && to < aired.aired;
                  const behind = !serverBehind && aired !== null && !aired.exact;
                  const notAired = !serverBehind && !behind;
                  expect(m.text.includes("no new episode has aired"), label).toBe(!stale && belowTotal && notAired);
                  expect(m.text.includes("as far as this page knows"), label).toBe(!stale && belowTotal && behind);
                  expect(m.text.includes("doesn't count a new episode"), label).toBe(!stale && belowTotal && serverBehind);
                  expect(m.text.includes("is already at"), label).toBe(!stale && !belowTotal);
                  expect(m.text.includes("It had changed since"), label).toBe(stale);
                }
                expect(m.text.length, label).toBeLessThanOrEqual(112);
                expect(m.spoken, label).not.toMatch(/[/–]/);
              }
            }
          }
        }
      }
    }
  });
});

describe("review fixes", () => {
  const p = (episodeProgressNumber: number, overrides: Partial<UserAnimeData> = {}) =>
    data({ episodeProgressNumber, ...overrides });

  it("says caught up only when the burst ends on the last aired episode", () => {
    // 13/26 with EP 14 aired: three taps log only 14 now (the server caps the rest).
    expect(burstMessage({ first: p(13), last: p(14), stale: false, episodes: 26, title: "Knight", aired: { aired: 14, exact: true } }).text).toBe(
      "Episode 14 logged for Knight. Caught up."
    );
    // Logged ahead through Edit, then a +1 the server allowed past the page's lower bound: no claim.
    expect(burstMessage({ first: p(13), last: p(16), stale: false, episodes: 26, title: "Knight", aired: { aired: 14, exact: true } }).text).toBe(
      "Episodes 14–16 logged for Knight. 10 to go."
    );
  });

  it("says when an Undo went back to another writer's value", () => {
    const line = undoMessage({ from: p(21), restored: p(20), episodes: 26, title: "Knight", stale: true });
    expect(line.text).toBe("Undone, but it had changed since this page last checked: Knight is back to Ep 20 / 26.");
    expect(line.spoken).toBe("Undone, but it had changed since this page last checked: Knight is back to episode 20 of 26.");
    expect(undoMessage({ from: p(24, { listType: "completed", finishDate: day }), restored: p(23), episodes: 24, stale: true }).text).toBe(
      "Undone, but it had changed since this page last checked: back in Watching at Ep 23 / 24. Finish date cleared."
    );
  });

  it("says a dropped Undo after a sign-out", () => {
    expect(
      failedMessage({ action: "save", outcome: "rejected", reason: "signedOut", undoDropped: true, current: p(14), episodes: 26, title: "Knight" }).text
    ).toBe("Couldn't save: you're signed out, so Undo wasn't sent. Knight is at Ep 14 / 26.");
  });
});
