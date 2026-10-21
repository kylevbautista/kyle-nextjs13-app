/**
 * Every line the iPhone widget shows (widgets/scriptable/kylevb-anime.js, CLAUDE.md §5.9). The server sends
 * them in the payload (lib/widget.ts), so the words change with a deploy, not a re-paste; the script keeps
 * only the no-payload lines (WIDGET_FALLBACK_COPY, mirrored and parity-tested). A widget is a cached render
 * shown for an unknown time, so every line stays true at any age: absolute Pacific Time labels (never
 * Today/Tomorrow), past-tense statuses, no "now" or "left" (the truth sweep in widgetCopy.test.ts).
 * The Next-episodes card's own words come from listCopy.ts. Pure: no React, no clock.
 */
import { MONTHS, WEEKDAYS } from "@/lib/anime/airing";
import { calendarDayMs } from "@/lib/anime/normalize";
import { DAY_LABELS, formatTime, scheduleWhen } from "@/components/mylist/schedule";
import {
  COUNTDOWNS_RESTING,
  NEXT_EPISODES_NOTE,
  NEXT_EPISODES_TITLE,
  NEXT_UP_LABEL,
  PREDATION_LINE,
  SCHEDULE_EYEBROW,
  SCHEDULE_SKIPS_LINE,
  WHOLE_WEEK_LABEL,
  noAnimeYetTitle,
  nothingScheduledTitle,
  scheduleStandingLine,
  scheduleTitle,
} from "./listCopy";

/** What the payload says about the list (the phone may still turn "rows" into "resting" as rows age out). */
export type WidgetState = "rows" | "resting" | "nothing-scheduled" | "empty-list";
export type WidgetKind = "Notice" | "Report" | "Warning";

/** A Great Sage state: its tag, a title, a line (null: none) and the one-line Lock Screen version. */
export interface WidgetLine {
  kind: WidgetKind;
  title: string;
  text: string | null;
  inline: string;
}

export interface WidgetCopy {
  tags: { Notice: "《Notice》"; Report: "《Report》"; Warning: "《Warning》" };
  sep: " · ";
  eyebrow: string;
  sage: string;
  title: string;
  header: string;
  headerNote: string;
  ticker: string;
  footer: string;
  aired: string;
  savedNote: string;
  /** The large widget's Sage line over saved rows when the phone got no answer. */
  offline: string;
  /** The same when kylevb.com answered without the list: any HTTP reply but a payload or the route's 404/410. */
  unavailable: string;
  resting: WidgetLine;
  state: WidgetLine | null;
}

export const WIDGET_TAGS: WidgetCopy["tags"] = { Notice: "《Notice》", Report: "《Report》", Warning: "《Warning》" };
export const WIDGET_SEP = " · ";
/** CountdownText's compact word for an episode whose time has passed. */
export const WIDGET_AIRED = "Aired";
/** The site's "↓" scrolls to the week panel; the widget opens the page. */
export const WIDGET_ARROW = "→";
/** The resting card: the card's own "Those episodes", but nothing about when the next ones come. */
export const RESTING_LINE = "Those episodes have aired. New ones appear when AniList and this widget refresh.";

export interface WidgetWhen {
  /** "Thu" (0–6 Pacific Time days out at render), "Thu Oct 22", "Thu Jan 7, 2027". */
  day: string;
  /** "9:30 AM PT". */
  time: string;
  /** "Thu 9:30 AM PT", "Thu Oct 22, 10:00 AM PT". */
  when: string;
}

/**
 * A row's air time, absolute so it stays true however late iOS redraws: the schedule's no-clock labels
 * (scheduleWhen with relative = false), with the weekday added back to the date form as schedule.ts asks of
 * any reuse outside the week panel.
 */
export function widgetWhen(airingAt: number, nowMs: number): WidgetWhen {
  const w = scheduleWhen(airingAt, nowMs, false);
  const time = `${w.time} PT`;
  if (w.kind === "date") {
    const weekday = DAY_LABELS[WEEKDAYS[new Date(calendarDayMs(airingAt * 1000)).getUTCDay()]].short;
    const day = `${weekday} ${w.day}`;
    return { day, time, when: `${day}, ${time}` };
  }
  return { day: w.day, time, when: `${w.day} ${time}` };
}

/** "Oct 15, 7:05 AM PT": when a saved copy was fetched (absolute, so it holds across midnight). */
export function pacificStamp(ms: number): string {
  const day = new Date(calendarDayMs(ms));
  return `${MONTHS[day.getUTCMonth()]} ${day.getUTCDate()}, ${formatTime(ms / 1000)} PT`;
}

/** The header note of a saved copy shown when kylevb.com didn't answer. */
export const savedNote = (generatedAtMs: number) => `Saved ${pacificStamp(generatedAtMs)}`;
/** The large widget's Sage line on a saved copy: past tense, so it stays true once the network is back. */
export const offlineLine = (generatedAtMs: number) =>
  `Couldn't reach kylevb.com. Showing air times saved ${pacificStamp(generatedAtMs)}.`;
/** The same when kylevb.com answered, but with an error: it was reached. */
export const unavailableLine = (generatedAtMs: number) =>
  `kylevb.com had a problem. Showing air times saved ${pacificStamp(generatedAtMs)}.`;

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const graphemes = (text: string) => Array.from(segmenter.segment(text), (part) => part.segment);

/** At most `max` graphemes (emoji and ZWJ sequences stay whole), ending in "…" when clipped. */
export function clipGraphemes(text: string, max: number): string {
  const parts = graphemes(text);
  return parts.length > max ? `${parts.slice(0, max - 1).join("").trimEnd()}…` : text;
}

/**
 * The widest first name, in monospaced columns (sageColumns), the large widget's two-line Sage box fits on the
 * narrowest large widget (305.5 pt: the iPad mini and the 768 × 1024 iPads; wrapped by words, SF Mono 11 pt at its
 * 0.75 floor with a flexible spacer's minimum reserved: 37 columns a line), with a column to spare:
 * "Thought Acceleration: <12>'s week, computed in Pacific Time." The payload is the same on every device, so a
 * wider name gets the share images' neutral "this list's" everywhere.
 */
export const SAGE_NAME_MAX = 12;

/** Graphemes a monospaced font draws two columns wide: CJK, kana, Hangul, full-width forms, emoji. */
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\u3000-\u303F\uFF01-\uFF60\uFFE0-\uFFE6]/u;

/** A name's width in the Sage box's monospaced columns (a wide grapheme counts 2). */
export const sageColumns = (name: string) => graphemes(name).reduce((sum, g) => sum + (WIDE.test(g) ? 2 : 1), 0);

/** Every row has aired (or the server found none left). */
export const WIDGET_RESTING: WidgetLine = {
  kind: "Report",
  title: COUNTDOWNS_RESTING,
  text: RESTING_LINE,
  inline: COUNTDOWNS_RESTING,
};

/** The list's own states (from the payload); "rows" and "resting" have none. */
export function widgetStateLine(state: WidgetState, name: string): WidgetLine | null {
  if (state === "nothing-scheduled") {
    const title = nothingScheduledTitle(name);
    return { kind: "Report", title, text: SCHEDULE_SKIPS_LINE, inline: title };
  }
  if (state === "empty-list") {
    const title = noAnimeYetTitle(name);
    return { kind: "Report", title, text: PREDATION_LINE, inline: title };
  }
  return null;
}

/** The lines the script shows with no payload (kylevb-anime.js's FALLBACK_COPY is a parity-tested copy). */
export type WidgetFallbackKey = "setup" | "badLink" | "notFound" | "notFoundParam" | "unreachable" | "unavailable" | "outdated" | "error";
/**
 * The no-payload states. A bad link only ever comes from a widget's Parameter field (the in-app link is checked
 * when it is saved), and a Parameter overrides the in-app link, so those lines point at Edit Widget.
 */
export const WIDGET_FALLBACK_COPY: Record<WidgetFallbackKey, WidgetLine> = {
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
};

/** The payload's copy for one list: `name` is the owner's public first name. */
export function widgetCopy(name: string, state: WidgetState, generatedAtMs: number): WidgetCopy {
  const possessive = sageColumns(name) <= SAGE_NAME_MAX ? `${name}'s` : "this list's";
  return {
    tags: WIDGET_TAGS,
    sep: WIDGET_SEP,
    eyebrow: SCHEDULE_EYEBROW,
    sage: scheduleStandingLine(possessive),
    title: scheduleTitle(name),
    header: NEXT_EPISODES_TITLE,
    headerNote: NEXT_EPISODES_NOTE,
    ticker: NEXT_UP_LABEL,
    footer: `${WHOLE_WEEK_LABEL} ${WIDGET_ARROW}`,
    aired: WIDGET_AIRED,
    savedNote: savedNote(generatedAtMs),
    offline: offlineLine(generatedAtMs),
    unavailable: unavailableLine(generatedAtMs),
    resting: WIDGET_RESTING,
    state: widgetStateLine(state, name),
  };
}
