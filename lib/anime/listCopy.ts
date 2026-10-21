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

/**
 * Invisible characters a name may carry: the bidi controls (LRM, RLM, LRE…RLO, LRI…PDI), the Arabic letter mark,
 * the zero-width space, the word joiner and invisible operators, the deprecated format controls, the BOM, the soft
 * hyphen, the combining grapheme joiner, the Mongolian vowel separator, the Khmer inherent vowels and the Hangul
 * fillers ("ㅤ" passes for a blank name). Written as escapes: a raw RLO can visually reorder source code ("Trojan
 * Source"). Never strip U+200C/U+200D (ZWNJ/ZWJ), variation selectors or tag characters: emoji sequences, flags
 * and some scripts need them.
 */
export const INVISIBLE_FORMAT =
  /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u3164\uFEFF\uFFA0]/g;

/**
 * A character something is drawn for: not whitespace, not a default-ignorable (a lone ZWJ, a tag), not a control or
 * format character, not a blank (the braille blank, the musical null notehead).
 */
const VISIBLE = /[^\p{Default_Ignorable_Code_Point}\p{White_Space}\p{Cc}\p{Cf}\u2800\u{1D159}]/u;
/** Whitespace between words (not U+FEFF: JavaScript's \s counts the zero-width no-break space, a format character). */
const WORD_BREAK = /(?:(?!\uFEFF)[\s\p{White_Space}])+/u;

/** Whether anything in `text` is drawn (a name of only invisible characters is no name). */
export const hasVisible = (text: string) => VISIBLE.test(text);

/**
 * How a list owner is named to other people: first name only (lists are public by link). That is the name's first
 * word, with invisible characters stripped (an RLO would flip the rest of a line). A first word with nothing drawn
 * (a blanked first name, such as a Hangul filler) is no name: never the next word, which is usually the family
 * name. Owners see their full name.
 */
export const publicOwnerName = (name: string | null | undefined): string | null => {
  const first = name?.split(WORD_BREAK).find(Boolean)?.replace(INVISIBLE_FORMAT, "");
  return first && hasVisible(first) ? first : null;
};

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

/** What the schedule leaves out (its sub, and the iPhone widget's nothing-scheduled line). */
export const SCHEDULE_SKIPS_LINE = "Completed and dropped shows stay out of the way.";

export const scheduleSub = (airingCount: number) =>
  airingCount > 0
    ? `${showsLabel(airingCount)} with an upcoming episode, lined up by the day it airs. ${SCHEDULE_SKIPS_LINE}`
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

/**
 * The Next-episodes card's words (components/mylist/NextEpisodes.tsx, components/home/HeroNextUp.tsx), shared with
 * the iPhone widget (lib/anime/widgetCopy.ts), which draws the same card.
 */
export const NEXT_EPISODES_TITLE = "Next episodes";
export const NEXT_EPISODES_NOTE = "Pacific Time";
/** The phone ticker's label (shown upper-case). */
export const NEXT_UP_LABEL = "Next up";
/** The Airing Schedule card's footer jump (to the week panel's All tab). */
export const WHOLE_WEEK_LABEL = "The whole week";
/** HeroNextUp's phone ticker with no row left, and the widget's resting state. */
export const COUNTDOWNS_RESTING = "Countdowns are resting";
/** The running bit for an empty list (tempest-theme "Voice"): the iPhone widget's empty-list line. */
export const PREDATION_LINE = "Recommend: predation.";
