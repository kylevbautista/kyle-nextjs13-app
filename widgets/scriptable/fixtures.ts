/**
 * Lists and payloads for the widget's tests (lib/widget.test.ts, widgets/scriptable/*.test.ts) and the
 * scratchpad preview: real ListEntry objects (through normalizeEntry) and real payloads (buildWidgetPayload).
 * Times are fixed Pacific Time epochs.
 */
import { normalizeEntry } from "@/lib/anime/normalize";
import type { ListEntry, ListStatus } from "@/lib/anime/types";
import { buildWidgetPayload, type WidgetPayload } from "@/lib/widget";

/** Thu 2026-10-15 7:05 AM PDT. */
export const NOW = 1792073100000;
/** Unix seconds of NOW. */
export const NOW_S = NOW / 1000;
export const USER_ID = "65f1c0ffee0123456789abcd";
/** Sun Nov 1 2026 1:00 AM PST (the second 1 AM: DST has ended). */
export const DST_END = 1793523600;

export const coverUrl = (id: number) => `https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx${id}-example.jpg`;

export interface EntrySpec {
  id: number;
  title: string;
  /** Unix seconds of the stored next episode; null: none scheduled. */
  at?: number | null;
  /** The next episode's number; null: AniList gives none. */
  episode?: number | null;
  episodes?: number | null;
  status?: ListStatus;
  progress?: number;
  mediaStatus?: string;
  cover?: string | null;
  color?: string | null;
  english?: string | null;
}

/** A stored list entry, normalized like a real read. */
export function makeEntry({
  id,
  title,
  at = null,
  episode = 1,
  episodes = 12,
  status = "watching",
  progress = 0,
  mediaStatus = "RELEASING",
  cover = coverUrl(id),
  color = "#5d86e4",
  english = null,
}: EntrySpec): ListEntry {
  const entry = normalizeEntry({
    id,
    title: { romaji: title, english, native: null },
    description: "<b>Stored</b> description",
    coverImage: { extraLarge: null, large: cover, medium: cover, color },
    status: mediaStatus,
    episodes,
    genres: ["Action"],
    upcomingEpisode: at ? { id: id * 10, episode, timeUntilAiring: 0, mediaId: id } : null,
    upComingAirDate: { episode: at ? [{ airingAt: at, timeUntilAiring: 0, episode }] : [] },
    firstEpisode: { episode: [] },
    userData: { listType: status, episodeProgressNumber: progress, startDate: null, finishDate: null, score: null },
  });
  if (!entry) throw new Error(`fixture ${id} didn't normalize`);
  return entry;
}

/** Shows that never reach the schedule: completed, dropped, finished. */
const offSchedule = (from: number, count: number): ListEntry[] =>
  Array.from({ length: count }, (_, i) =>
    makeEntry({
      id: from + i,
      title: `Archive Show ${i + 1}`,
      status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "dropped" : "watching",
      mediaStatus: "FINISHED",
      progress: 12,
    })
  );

/**
 * The spec's example list (SPEC §2.9) at NOW: Tensura's EP 7 aired 15 min ago and isn't logged (hungry), then
 * soon / day / day / far rows, an unknown episode and a date-form row a week out. 10 shows: Demon Lord.
 */
export function mixedEntries(): ListEntry[] {
  return [
    makeEntry({ id: 182205, title: "Tensei shitara Slime Datta Ken 4th Season", english: "That Time I Got Reincarnated as a Slime Season 4", at: 1792072200, episode: 7, episodes: 24, progress: 5, color: "#43a1e4" }),
    makeEntry({ id: 200001, title: "Sousou no Frieren 2", english: "Frieren: Beyond Journey's End Season 2", at: 1792074600, episode: 4, progress: 3, color: "#d6e4a1" }),
    makeEntry({ id: 200002, title: "Kaiju Patrol", at: 1792081800, episode: 13, episodes: 24, progress: 12, color: null }),
    makeEntry({ id: 200006, title: "Witch Watch Season 2", at: 1792130400, episode: 2, status: "planning", cover: null, color: "#e45d8e" }),
    makeEntry({ id: 200003, title: "Witch Hat Atelier", at: 1792162800, episode: 1, status: "planning", mediaStatus: "NOT_YET_RELEASED", color: "#e4bb6b" }),
    makeEntry({ id: 200004, title: "Detective Example", at: 1792255500, episode: null, episodes: null, cover: null, color: "#5d86e4" }),
    makeEntry({ id: 200005, title: "Monthly Example Season 2", at: 1792688400, episode: 14, episodes: 24, progress: 13, color: "#a1e4d6" }),
    ...offSchedule(300001, 3),
  ];
}

export type Scenario =
  | "mixed"
  | "premiere-unknown-long"
  | "hungry"
  | "not-hungry"
  | "resting"
  | "nothing-scheduled"
  | "empty-list"
  | "one-row"
  | "worst-case";

const LONG_TITLE =
  "Kono Subarashii Sekai ni Shukufuku wo! The Extraordinarily Long Subtitle of the Third Season Part Two";

/** The list behind each test scenario, as stored at `nowMs`. */
export function scenarioEntries(scenario: Scenario, nowMs: number = NOW): ListEntry[] {
  const s = Math.floor(nowMs / 1000);
  switch (scenario) {
    case "mixed":
      return mixedEntries();
    case "premiere-unknown-long":
      return [
        makeEntry({ id: 400001, title: "Brand New Premiere", at: s + 26 * 3600, episode: 1, status: "planning", mediaStatus: "NOT_YET_RELEASED" }),
        makeEntry({ id: 400002, title: "Unnumbered Show", at: s + 5 * 3600, episode: null, episodes: null }),
        makeEntry({ id: 400003, title: LONG_TITLE, at: s + 40 * 60, episode: 9, progress: 8 }),
      ];
    case "hungry":
      return [
        makeEntry({ id: 400011, title: "Unlogged Show", at: s - 10 * 60, episode: 5, progress: 3 }),
        makeEntry({ id: 400012, title: "Later Show", at: s + 3 * 3600, episode: 2, progress: 1 }),
      ];
    case "not-hungry":
      return [
        makeEntry({ id: 400021, title: "Caught Up Show", at: s + 2 * 3600, episode: 5, progress: 4 }),
        makeEntry({ id: 400022, title: "Planned Show", at: s + 5 * 3600, episode: 1, status: "planning", mediaStatus: "NOT_YET_RELEASED" }),
      ];
    case "resting":
      return [
        makeEntry({ id: 400031, title: "Aired Long Ago", at: s - 3 * 3600, episode: 5, progress: 5 }),
        makeEntry({ id: 400032, title: "Also Aired", at: s - 2 * 3600, episode: 8, progress: 8 }),
      ];
    case "nothing-scheduled":
      return offSchedule(400041, 4);
    case "empty-list":
      return [];
    case "one-row":
      return [makeEntry({ id: 400051, title: "Only Show", at: s + 3 * 3600, episode: 3, progress: 2 }), ...offSchedule(400052, 2)];
    case "worst-case":
      // 2,000 shows (the list cap), the 8 soonest with 200-character CJK titles and dated labels.
      return Array.from({ length: 2000 }, (_, i) =>
        makeEntry({
          id: 500000 + i,
          title: i < 8 ? "転".repeat(200) : `Show ${i}`,
          english: null,
          at: s + 8 * 86_400 + i * 60,
          episode: 1000 + i,
          episodes: 2000,
          progress: 0,
          status: "watching",
        })
      );
  }
}

/** A real payload for the scenario. */
export const payloadAt = (scenario: Scenario, nowMs: number = NOW, name = "Kyle"): WidgetPayload =>
  buildWidgetPayload({ userId: USER_ID, name, entries: scenarioEntries(scenario, nowMs), nowMs });
