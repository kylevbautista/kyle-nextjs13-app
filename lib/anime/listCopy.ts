/**
 * What My List and the Airing Schedule say to visitors, shared with their
 * link-preview images (components/og/shareCard.ts): one source per line
 * (tempest-theme rule 9). Pure: no React, no clock. `name` is the owner's
 * public first name. It is null only inside a share image, when the name is in
 * a script Satori can't shape (shareCard.ts#drawableName); those lines say
 * "this list" instead.
 */
import { showsLabel } from "@/lib/landing";
import type { ListEntry } from "./types";

/** How a list owner is named to other people: first name only (lists are public by link). Owners see their full name. */
export const publicOwnerName = (name: string | null | undefined): string | null =>
  name?.trim().split(/\s+/)[0] || null;

export interface ListStats {
  shows: number;
  watching: number;
  episodes: number;
  /** One decimal ("8.8"), or null when nothing is scored (the page shows "—"). */
  meanScore: string | null;
  /** Literally "still airing": AniList says the show is releasing, whatever its list status. */
  releasing: number;
}

/** My List's banner readout. Real list data only. */
export function listStats(entries: readonly Pick<ListEntry, "status" | "userData">[]): ListStats {
  let episodes = 0;
  let scoreSum = 0;
  let scored = 0;
  let watching = 0;
  let releasing = 0;
  for (const entry of entries) {
    episodes += entry.userData.episodeProgressNumber;
    if (entry.userData.score !== null) {
      scoreSum += entry.userData.score;
      scored += 1;
    }
    if (entry.userData.listType === "watching") watching += 1;
    if (entry.status === "RELEASING") releasing += 1;
  }
  return {
    shows: entries.length,
    watching,
    episodes,
    meanScore: scored ? (Math.round((scoreSum / scored) * 10) / 10).toFixed(1) : null,
    releasing,
  };
}

/** The banners' eyebrows (canon skill names, tempest-theme "Voice"). */
export const LIST_EYEBROW = "Skill 02 · Predator";
export const SCHEDULE_EYEBROW = "Skill 03 · Thought Acceleration";

export const LIST_STAT_LABELS = {
  shows: "Shows",
  watching: "Watching",
  episodes: "Episodes seen",
  meanScore: "Mean score",
} as const;

export const listOf = (name: string | null) => (name ? `${name}'s list` : "this list");
export const listTitle = (name: string | null) => (name ? `${name}'s list` : "Anime list");
export const scheduleTitle = (name: string | null) => (name ? `${name}'s airing schedule` : "Airing schedule");

/** My List's visitor Great Sage line. */
export function listVisitorLine(
  name: string | null,
  stats: Pick<ListStats, "shows" | "releasing">
): { kind: "Report"; text: string } {
  if (!stats.shows) {
    return { kind: "Report", text: name ? `${name} hasn't stored any shows yet.` : "This list has no shows yet." };
  }
  return {
    kind: "Report",
    text: `Analysis complete: ${showsLabel(stats.shows)} on ${listOf(name)}, ${stats.releasing} still airing.`,
  };
}

export const listVisitorSub = (name: string | null) =>
  name
    ? `What ${name} is watching, planning and has finished. Only ${name} can edit it.`
    : "What its owner is watching, planning and has finished. Only its owner can edit it.";

/** My List's visitor empty state (SagePanel). */
export const LIST_EMPTY_TITLE = "Nothing here yet";
export const listEmptyBody = (name: string | null) =>
  name ? `${name} hasn't added any anime to their list.` : "No anime on this list yet.";

/** The Airing Schedule's standing Great Sage line. `possessive`: "your", "Kyle's" or "this list's". */
export const scheduleStandingLine = (possessive: string) =>
  `Thought Acceleration: ${possessive} week, computed in Pacific Time.`;

export const scheduleSub = (airingCount: number) =>
  airingCount > 0
    ? `${showsLabel(airingCount)} with an upcoming episode, lined up by the day it airs. Completed and dropped shows stay out of the way.`
    : "Every show on the list with an upcoming episode, lined up by the day it airs.";

/** The Airing Schedule's visitor empty-state titles (SagePanel). */
export const noAnimeYetTitle = (name: string | null) =>
  name ? `${name} hasn't added any anime yet` : "No anime on this list yet";
export const nothingAiringTitle = (listName: string) => `Nothing on ${listName} is airing right now`;
/**
 * The schedule share image's version: an image is kept for days, so it never
 * says "right now" (the schedule leaves out completed and dropped shows).
 */
export const nothingScheduledTitle = (name: string | null) =>
  name ? `Nothing on ${name}'s airing schedule` : "Nothing on this airing schedule";
