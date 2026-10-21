/**
 * The iPhone widget's data (widgets/scriptable/kylevb-anime.js, CLAUDE.md §5.9): what
 * GET /api/widget/v1/list/<id> sends, built from a list's stored entries, plus the reference versions of the
 * rules the script applies on the phone (which rows are still visible, each row's phase and lines, the next
 * refresh, the Parameter field). The script can't import this file, so it re-implements those rules and
 * widgets/scriptable/parity.test.ts checks them against these.
 *
 * The split: the server sends only what stays true at any age (rows with absolute Pacific Time labels, the
 * copy, the tier, when the slime gets hungry); the phone decides what depends on its clock. Pure: no React.
 */
import { airingSchedulePath, myListPath, widgetArtPath } from "@/lib/routes";
import { airingWeekday, compareByNextAiring, nextAiring, unloggedAired } from "@/lib/anime/airing";
import { displayTitle, type ListEntry } from "@/lib/anime/types";
import { AIRED_GRACE_SECONDS, evolutionTier, visibleAiring, type EvolutionTier } from "@/lib/landing";
import { SCHEDULE_DAYS, buildSchedule, dayParam, episodeLabel } from "@/components/mylist/schedule";
import { clipGraphemes, widgetCopy, widgetWhen, type WidgetCopy, type WidgetState } from "@/lib/anime/widgetCopy";
import { WIDGET_ART_VERSION } from "@/lib/widgetArt";

export type { WidgetCopy, WidgetLine, WidgetState } from "@/lib/anime/widgetCopy";
export { clipGraphemes } from "@/lib/anime/widgetCopy";

/** The payload contract's version (`schema`); a breaking change ships /v2. */
export const WIDGET_SCHEMA = 1 as const;
/** The current script's version: SCRIPT_VERSION in kylevb-anime.js (parity). Bump both on any script change. */
export const WIDGET_SCRIPT_VERSION = 2;
/** True once every widget has been re-pasted past v1: the v1 route then answers 410 ("Update this widget"). */
export const WIDGET_V1_RETIRED: boolean = false;
/** Every link and the only host the script fetches; never the request's host. */
export const WIDGET_ORIGIN = "https://kylevb.com";
export const WIDGET_SCRIPT_SOURCE =
  "https://github.com/kylevbautista/kyle-nextjs13-app/blob/main/widgets/scriptable/kylevb-anime.js";
/** Rows sent: more than any family shows (3), so rows that age out on the phone backfill. */
export const WIDGET_ROWS_SENT = 8;
/** Graphemes. */
export const WIDGET_NAME_MAX = 20;
export const WIDGET_TITLE_MAX = 80;
export const WIDGET_PAYLOAD_MAX_BYTES = 8192;
/** CountdownText's "soon": the last hour turns amber. */
export const WIDGET_SOON_SECONDS = 3600;
/** A live timer only within a day (Scriptable's timer has no days unit). */
export const WIDGET_TIMER_SECONDS = 86_400;
/** A saved payload younger than this is reused without a request (iOS reloads several widgets at once). */
export const WIDGET_FRESH_MS = 90_000;
/** An older saved copy isn't shown. */
export const WIDGET_SAVED_MAX_AGE_MS = 7 * 86_400_000;
/** refreshAfterDate: the next row boundary + slack, never sooner than minMs, never later than the outcome's cap. */
export const WIDGET_REFRESH = {
  minMs: 300_000,
  okMs: 1_800_000,
  savedMs: 900_000,
  idleMs: 3_600_000,
  outdatedMs: 21_600_000,
  slackMs: 15_000,
} as const;

export interface WidgetTuning {
  /** The next request's timeout (the script clamps it to 2–8). */
  jsonTimeoutS: number;
  /** Covers fetched per widget run (0–3). */
  coverFetches: number;
  /** The large sky's density cap (2 halves its decoded size on 3× phones). */
  largeSkyMaxScale: 2 | 3;
}
/** Read from the saved payload by the next run, so a device-side fix ships as a deploy, not a re-paste. */
export const WIDGET_TUNING: WidgetTuning = { jsonTimeoutS: 5, coverFetches: 3, largeSkyMaxScale: 3 };

/** A list owner's tier (evolutionTier for a signed-in owner is never "slime"). */
export type WidgetTier = Exclude<EvolutionTier, "slime">;

export interface WidgetRow {
  /** AniList id (never shown). */
  id: number;
  /** displayTitle, ≤ 80 graphemes. */
  title: string;
  /** "EP 13" | "Premiere" | "Next EP". */
  label: string;
  /** The episode's air time, unix seconds. */
  at: number;
  /** widgetWhen(): "Thu" | "Thu Oct 22" | "Thu Jan 7, 2027". */
  day: string;
  /** "9:30 AM PT". */
  time: string;
  /** "Thu 9:30 AM PT" | "Thu Oct 22, 10:00 AM PT". */
  when: string;
  /** AniList's large cover (s4.anilist.co only), else null. */
  cover: string | null;
  /** The cover's "#rrggbb" placeholder color, else null. */
  color: string | null;
  /** The Airing Schedule's tab for the episode's PT weekday. */
  url: string;
}

export interface WidgetPayload {
  schema: typeof WIDGET_SCHEMA;
  /** Server clock, ms. */
  generatedAt: number;
  state: WidgetState;
  /** First name (≤ 20 graphemes) and evolutionTier(true, entries). */
  owner: { name: string; tier: WidgetTier };
  /**
   * Unix seconds from which a Watching/Paused show has an aired episode not logged (the happy slime): at or
   * before generatedAt means already; null: none known.
   */
  hungrySince: number | null;
  /** ≤ 8, soonest first. */
  rows: WidgetRow[];
  links: { schedule: string; week: string; list: string; browse: string };
  art: { version: number; base: string };
  script: { latest: number; source: string };
  tuning: WidgetTuning;
  copy: WidgetCopy;
}

const COVER_PREFIX = "https://s4.anilist.co/";
const COLOR_RE = /^#[0-9a-f]{6}$/i;

/**
 * When the slime gets hungry: now, if a Watching/Paused show already has an aired episode not logged (the
 * "N new" chip, which /mylist/<id> shows visitors too); else the first upcoming air time that brings one;
 * else null.
 */
export function widgetHungrySince(entries: readonly ListEntry[], nowMs: number): number | null {
  const nowS = Math.floor(nowMs / 1000);
  let first: number | null = null;
  for (const entry of entries) {
    if ((unloggedAired(entry, nowMs) ?? 0) > 0) return nowS;
    const next = nextAiring(entry);
    if (!next || next.airingAt <= nowS || (first !== null && next.airingAt >= first)) continue;
    if ((unloggedAired(entry, next.airingAt * 1000) ?? 0) > 0) first = next.airingAt;
  }
  return first;
}

/** One row of the payload (`entry` has a next episode). */
export function toWidgetRow(entry: ListEntry, userId: string, nowMs: number): WidgetRow {
  const next = nextAiring(entry);
  if (!next) throw new Error(`toWidgetRow: show ${entry.id} has no next episode`);
  const cover = entry.coverImage.large ?? entry.coverImage.medium;
  const color = entry.coverImage.color;
  return {
    id: entry.id,
    title: clipGraphemes(displayTitle(entry), WIDGET_TITLE_MAX),
    label: episodeLabel(next.episode),
    at: next.airingAt,
    ...widgetWhen(next.airingAt, nowMs),
    cover: cover?.startsWith(COVER_PREFIX) ? cover : null,
    color: color && COLOR_RE.test(color) ? color : null,
    url: `${WIDGET_ORIGIN}${airingSchedulePath(userId)}${dayParam(airingWeekday(entry))}`,
  };
}

/** The payload for one list: its Airing Schedule's next episodes (as the Next-episodes card picks them). */
export function buildWidgetPayload({
  userId,
  name,
  entries,
  nowMs,
}: {
  userId: string;
  name: string;
  entries: readonly ListEntry[];
  nowMs: number;
}): WidgetPayload {
  const schedule = buildSchedule(entries);
  // Exactly AiringSchedule.tsx's `upcoming` (the card's rows): every weekday, soonest first.
  const upcoming = SCHEDULE_DAYS.flatMap((day) => schedule.days[day]).sort(compareByNextAiring);
  const rows = (visibleAiring(upcoming, nowMs, WIDGET_ROWS_SENT) as ListEntry[]).map((entry) =>
    toWidgetRow(entry, userId, nowMs)
  );
  const state: WidgetState = !entries.length
    ? "empty-list"
    : !schedule.airingCount
      ? "nothing-scheduled"
      : rows.length
        ? "rows"
        : "resting";
  const owner = clipGraphemes(name, WIDGET_NAME_MAX);
  const scheduleUrl = `${WIDGET_ORIGIN}${airingSchedulePath(userId)}`;
  return {
    schema: WIDGET_SCHEMA,
    generatedAt: nowMs,
    state,
    owner: { name: owner, tier: evolutionTier(true, entries.length) as WidgetTier },
    hungrySince: widgetHungrySince(entries, nowMs),
    rows,
    links: {
      schedule: scheduleUrl,
      week: `${scheduleUrl}${dayParam("all")}`,
      list: `${WIDGET_ORIGIN}${myListPath(userId)}`,
      browse: `${WIDGET_ORIGIN}/anime`,
    },
    art: { version: WIDGET_ART_VERSION, base: `${WIDGET_ORIGIN}${widgetArtPath("")}` },
    script: { latest: WIDGET_SCRIPT_VERSION, source: WIDGET_SCRIPT_SOURCE },
    tuning: WIDGET_TUNING,
    copy: widgetCopy(owner, state, nowMs),
  };
}

// ---------------------------------------------------------------------------
// The phone's rules (the script re-implements each; parity.test.ts compares them)
// ---------------------------------------------------------------------------

/**
 * A row at the phone's clock: far (≥ 24 h: the when-line only), day (1–24 h: + a live timer), soon (the last
 * hour: amber), aired (up to 30 min after: "Aired …", no timer), gone (dropped, like visibleAiring).
 */
export type WidgetPhase = "far" | "day" | "soon" | "aired" | "gone";

export function widgetRowPhase(at: number, nowMs: number): WidgetPhase {
  const s = at - nowMs / 1000;
  if (s >= WIDGET_TIMER_SECONDS) return "far";
  if (s >= WIDGET_SOON_SECONDS) return "day";
  if (s > 0) return "soon";
  if (s >= -AIRED_GRACE_SECONDS) return "aired";
  return "gone";
}

/** The first `count` rows not yet gone, in payload order. */
export function pickWidgetRows(rows: readonly WidgetRow[], nowMs: number, count: number): WidgetRow[] {
  const out: WidgetRow[] = [];
  for (const row of rows) {
    if (out.length >= count) break;
    if (widgetRowPhase(row.at, nowMs) !== "gone") out.push(row);
  }
  return out;
}

/** The one-row families' row: the first visible row that hasn't aired, else the aired one (labelled AIRED). */
export function widgetTickerRow(rows: readonly WidgetRow[], nowMs: number): WidgetRow | null {
  const visible = pickWidgetRows(rows, nowMs, WIDGET_ROWS_SENT);
  return visible.find((row) => widgetRowPhase(row.at, nowMs) !== "aired") ?? visible[0] ?? null;
}

export interface WidgetRowLines {
  /** The card's row line: "EP 4 · Thu 7:30 AM PT"; aired "EP 7 · Aired Thu 6:50 AM PT". */
  line: string;
  /** The small widget's label: "NEXT UP" | "AIRED". */
  smallLabel: string;
  /** "EP 4 · Thu" | "Premiere · Thu Oct 22"; aired "EP 7 · Aired Thu" (the label slot may hold a saved stamp). */
  smallA: string;
  /** "7:30 AM PT". */
  smallB: string;
  /** "NEXT UP · EP 4" | "NEXT UP · PREMIERE" | "NEXT UP" (Next EP) | "AIRED · EP 7" | "AIRED". */
  rectLabel: string;
  /** row.when. */
  rectLine3: string;
  /** "Thu 7:30 AM PT · EP 4 · <title>" (a tail truncation drops the title first); aired "Aired …". */
  inline: string;
  /** A live timer: phase day or soon. */
  timer: boolean;
  tone: "sage" | "soon" | "aired";
}

export function widgetRowLines(
  row: WidgetRow,
  phase: WidgetPhase,
  copy: Pick<WidgetCopy, "sep" | "aired" | "ticker">
): WidgetRowLines {
  const S = copy.sep;
  const aired = phase === "aired";
  const head = aired ? copy.aired.toUpperCase() : copy.ticker.toUpperCase();
  const labelTail = row.label === "Next EP" ? "" : `${S}${row.label.toUpperCase()}`;
  return {
    line: aired ? `${row.label}${S}${copy.aired} ${row.when}` : `${row.label}${S}${row.when}`,
    smallLabel: head,
    smallA: aired ? `${row.label}${S}${copy.aired} ${row.day}` : `${row.label}${S}${row.day}`,
    smallB: row.time,
    rectLabel: `${head}${labelTail}`,
    rectLine3: row.when,
    inline: aired
      ? `${copy.aired} ${row.when}${S}${row.label}${S}${row.title}`
      : `${row.when}${S}${row.label}${S}${row.title}`,
    timer: phase === "day" || phase === "soon",
    tone: phase === "soon" ? "soon" : aired ? "aired" : "sage",
  };
}

/**
 * The happy slime: a Watching/Paused show has an aired episode not logged. "Already" (hungrySince at or before
 * the payload's own generatedAt) holds whatever the phone's clock says, so a phone running behind the server
 * still shows it; a future hungrySince waits for the phone's clock.
 */
export function widgetIsHungry(payload: Pick<WidgetPayload, "hungrySince" | "generatedAt">, nowMs: number): boolean {
  const since = payload.hungrySince;
  return since !== null && (since * 1000 <= payload.generatedAt || nowMs / 1000 >= since);
}

export interface WidgetParameter {
  /** The list id, lower-case. */
  id: string | null;
  glass: boolean;
  /** Tokens that were neither an id nor "glass" (and any later id). */
  unknown: string[];
  /** One of them looks like a link (a cut-off one, or another page's): the app says so, not "words". */
  link: boolean;
}

const ID_IN_TOKEN = /(?:^|\/(?:user|mylist)\/)([0-9a-f]{24})(?=$|[/?#&])/;
/** Punctuation a link picks up in a sentence or a chat: "(…)", "<…>", a closing period. */
const WRAPPING = /^[(<[{"'\u201c\u2018]+|[)>\]}"'\u201d\u2019.!?:]+$/g;
const LINK_SHAPED = /\/|kylevb\.|^https?:/;

/**
 * The widget's Parameter field: `[<list link or id>] [glass]`, separated by spaces, commas or semicolons, in
 * any case. Accepts Copy link's https://kylevb.com/user/<id>, the share field's kylevb.com/user/<id>, a
 * /mylist/<id>?day=all link, a preview deploy's host or a bare id, also wrapped in "(…)", "<…>" or quotes or
 * followed by a period. The host is never used.
 */
export function parseWidgetParameter(raw: unknown): WidgetParameter {
  const text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  const out: WidgetParameter = { id: null, glass: false, unknown: [], link: false };
  for (const word of text.split(/[\s,;]+/)) {
    const token = word.replace(WRAPPING, "");
    if (!token) continue;
    if (token === "glass") {
      out.glass = true;
      continue;
    }
    const match = out.id === null ? ID_IN_TOKEN.exec(token) : null;
    if (match) out.id = match[1];
    else {
      out.unknown.push(token);
      if (LINK_SHAPED.test(token)) out.link = true;
    }
  }
  return out;
}

/** A widget run's outcome (its run log and refresh cap): "unavailable" is kylevb.com answering without the list. */
export type WidgetOutcome = "ok" | "fresh" | "saved" | "offline" | "unavailable" | "setup" | "bad-link" | "not-found" | "outdated" | "error";

const OUTCOME_CAP: Record<WidgetOutcome, number> = {
  ok: WIDGET_REFRESH.okMs,
  fresh: WIDGET_REFRESH.okMs,
  saved: WIDGET_REFRESH.savedMs,
  offline: WIDGET_REFRESH.savedMs,
  unavailable: WIDGET_REFRESH.savedMs,
  error: WIDGET_REFRESH.savedMs,
  setup: WIDGET_REFRESH.idleMs,
  "bad-link": WIDGET_REFRESH.idleMs,
  "not-found": WIDGET_REFRESH.idleMs,
  outdated: WIDGET_REFRESH.outdatedMs,
};

/**
 * The widget's refreshAfterDate (iOS treats it as the earliest): the next boundary of a shown row (a day out,
 * an hour out, its air time, 30 min after) or of hungrySince, plus slack; at most the outcome's cap, at least
 * 5 minutes away.
 */
export function widgetNextRefreshMs(
  shown: readonly Pick<WidgetRow, "at">[],
  nowMs: number,
  outcome: WidgetOutcome,
  hungrySince: number | null
): number {
  let next = nowMs + OUTCOME_CAP[outcome];
  const consider = (seconds: number) => {
    if (seconds * 1000 > nowMs) next = Math.min(next, seconds * 1000 + WIDGET_REFRESH.slackMs);
  };
  for (const { at } of shown) {
    for (const boundary of [at - WIDGET_TIMER_SECONDS, at - WIDGET_SOON_SECONDS, at, at + AIRED_GRACE_SECONDS]) {
      consider(boundary);
    }
  }
  if (hungrySince !== null) consider(hungrySince);
  return Math.max(next, nowMs + WIDGET_REFRESH.minMs);
}
