// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: magic;
/*
 * kylevb Anime: your Airing Schedule on the Home Screen and Lock Screen.            v1
 * Source: https://github.com/kylevbautista/kyle-nextjs13-app/blob/main/widgets/scriptable/kylevb-anime.js
 * ── SETUP ──────────────────────────────────────────────────────────────────────
 * kylevb Anime: your Airing Schedule on the Home Screen and Lock Screen
 *
 * 1. Install "Scriptable" from the App Store (free).
 * 2. On your iPhone, open this file on GitHub: widgets/scriptable/kylevb-anime.js → tap "Raw" →
 *    select all → Copy.
 * 3. In Scriptable tap +, paste, then tap the title and name the script kylevb-anime. Tap Done.
 * 4. Run it once (tap ▶). Choose "Link my list…" and paste your list link: on kylevb.com open your
 *    Airing Schedule and tap "Copy link". It looks like https://kylevb.com/user/65f1…
 *    (a /mylist/… link or just the id works too). Then try the previews.
 * 5. Home Screen: touch and hold an empty spot → Edit → Add Widget → Scriptable → pick Small,
 *    Medium or Large → Add Widget. Touch and hold the new widget → Edit Widget:
 *      Script:            kylevb-anime
 *      When Interacting:  leave as it is (the widget opens the right page itself)
 *      Parameter:         leave empty (it uses the link from step 4)
 * 6. Lock Screen (optional): touch and hold the Lock Screen → Customize → Lock Screen → tap the
 *    widget area → Scriptable → Rectangular, Inline or Circular → tap it → Script: kylevb-anime.
 * 7. Tinted or Clear Home Screen and the widget looks washed out? Run the script and turn on
 *    "Glass mode for every widget" (or add the word glass to one widget's Parameter).
 *
 * Showing a different list: paste its link into that widget's Parameter.
 * Reading it: times are Pacific Time, like the site. Countdowns tick live within a day of an episode.
 * iOS decides when a widget redraws, so right after an episode's time a countdown may count up until
 * it does; the time printed beside it is always right.
 * Updating: when the script's menu says a newer version is on GitHub, repeat steps 2–3, pasting over
 * the old text. Your link, saved data and widgets keep working.
 * Privacy: one request to kylevb.com per refresh for your list's public schedule (the same data as
 * your /mylist link), plus the widget's pictures from kylevb.com (downloaded once, and again after an
 * update) and AniList cover images. Stored on this phone only. No passwords, keys or tracking.
 * ── WHAT IT SENDS ─────────────────────────────────────────────────────────────
 * One GET to https://kylevb.com/api/widget/v1/list/<your list id> per refresh, plus the
 * site's art and AniList cover images. No secrets, no account, no tracking.
 *
 * For maintainers: CLAUDE.md §5.9 and §9.26 in the repo. The server sends every word and every Pacific Time
 * label (lib/widget.ts); this script decides only what depends on the phone's clock. Bump SCRIPT_VERSION
 * (and lib/widget.ts#WIDGET_SCRIPT_VERSION) on any change; widgets/scriptable/*.test.ts run it in a mock.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SCRIPT_VERSION = 1; // == WIDGET_SCRIPT_VERSION (parity)
const SCHEMA = 1; // == WIDGET_SCHEMA
const ORIGIN = "https://kylevb.com"; // == WIDGET_ORIGIN: the only data and art host, and every tap's host
const API_PATH = "/api/widget/v1/list/"; // == widgetListPath("")
const ART_PATH = "/api/widget/art/"; // == widgetArtPath("")
const COVER_PREFIX = "https://s4.anilist.co/";
const SOURCE_URL = "https://github.com/kylevbautista/kyle-nextjs13-app/blob/main/widgets/scriptable/kylevb-anime.js";
const ART_VERSION_FALLBACK = 1; // == WIDGET_ART_VERSION (parity): the art version before any payload arrived
const GRACE_S = 1800; // == AIRED_GRACE_SECONDS: an aired row stays 30 min
const SOON_S = 3600; // == WIDGET_SOON_SECONDS: the last hour is amber
const TIMER_S = 86400; // == WIDGET_TIMER_SECONDS: a live timer only within a day
const JSON_TIMEOUT_S = 5;
const IMAGE_TIMEOUT_S = 3;
const APP_TIMEOUT_S = 8;
const APP_IMAGE_CAP_S = 20; // an in-app image download's wall-clock cap (no run budget; a stall still ends at 8 s idle)
const ART_BEFORE_MS = 2000; // a widget run fetches missing art only this early
const COVERS_BEFORE_MS = 3000; // and missing covers only this early
// iOS's timeoutInterval is an idle timeout (it resets whenever bytes arrive), so a slow but steady link never
// trips it: every network wait in a widget run also races this wall-clock budget (a Timer).
const RUN_BUDGET_MS = 5500;
const MAX_COVERS = 3;
const FRESH_MS = 90000; // == WIDGET_FRESH_MS: reuse a copy this young without a request
const SAVED_MAX_AGE_MS = 7 * 86400000; // == WIDGET_SAVED_MAX_AGE_MS
const MAX_BODY_CHARS = 65536;
const REFRESH = { minMs: 300000, okMs: 1800000, savedMs: 900000, idleMs: 3600000, outdatedMs: 21600000, slackMs: 15000 }; // == WIDGET_REFRESH
const COVER_CACHE_MAX = 60;
const COVER_CACHE_KEEP = 48;
const RUN_LOG_MAX = 200;
const DIR = "kylevb-anime";
const CANONICAL_ID = /^[a-f0-9]{24}$/; // == CANONICAL_ID_RE
const ID_IN_TOKEN = /(?:^|\/(?:user|mylist)\/)([0-9a-f]{24})(?=$|[/?#&])/;
/** Punctuation a link picks up in a sentence or a chat: "(…)", "<…>", a closing period. */
const WRAPPING = /^[(<[{"'\u201c\u2018]+|[)>\]}"'\u201d\u2019.!?:]+$/g;
/** An unknown token that was meant as a link (cut off, or another page's): not the bare word (the script's name). */
const LINK_SHAPED = /\/|kylevb\.|^https?:/;
const STATES = ["rows", "resting", "nothing-scheduled", "empty-list"];
const TIERS = ["named", "demon", "lord"];
const KINDS = ["Notice", "Report", "Warning"];
const FAMILIES = ["small", "medium", "large", "accessoryRectangular", "accessoryInline", "accessoryCircular"];
/** Rows each family shows. */
const SHOWN = { small: 1, medium: 2, large: 3, accessoryRectangular: 1, accessoryInline: 1, accessoryCircular: 0 };

/** Colors: the site's tokens (NextEpisodes, the banners), glass variants (light, dark) and the Lock Screen's. */
const T = {
  title: "#ffffff",
  sage: "#95ccff",
  console: "#cfe8ff",
  muted: "#a4a4a4",
  soft: "#c8ceda",
  h1: "#f4f9ff",
  soonText: "#fde68a",
  soonDot: "#fbbf24",
  airedDot: "#34d399",
  hairline: ["#ffffff", 0.12],
  cardBorder: ["#95ccff", 0.25],
  sageBorder: ["#95ccff", 0.3],
  coverFallback: "#353535",
  skyBase: "#081020",
  skyStops: [
    ["#050915", 0],
    ["#0a1428", 0.55],
    ["#0e1d33", 1],
  ],
  glass: {
    title: ["#0b1220", "#ffffff"],
    sage: ["#1e5a96", "#95ccff"],
    console: ["#173c63", "#cfe8ff"],
    muted: ["#5a6272", "#a4a4a4"],
    soft: ["#4a5263", "#c8ceda"],
    h1: ["#0b1220", "#f4f9ff"],
    soonText: ["#8a5a00", "#fde68a"],
    soonDot: ["#b45309", "#fbbf24"],
    airedDot: ["#047857", "#34d399"],
    hairline: [
      ["#000000", 0.12],
      ["#ffffff", 0.14],
    ],
    cardBorder: [
      ["#1e5a96", 0.35],
      ["#95ccff", 0.3],
    ],
    sageBorder: [
      ["#1e5a96", 0.35],
      ["#95ccff", 0.3],
    ],
    glyphTint: ["#1e5a96", "#95ccff"],
  },
  lockPrimary: "#ffffff",
  lockSecondary: "#b4b4b4",
};

/**
 * Widget sizes in points (Apple's HIG table + measured phones; Scriptable can't report them):
 * [short, long, small, mediumW, largeH, rectW, rectH, inlineW, circle]. Medium is small tall, large is mediumW wide.
 * Lower bounds: "Large icons" Home Screens are 2–4 % bigger and the extra goes to flexible spacers.
 */
const SIZES = [
  [440, 956, 170, 364, 382, 172, 76, 257, 76],
  [430, 932, 170, 364, 382, 172, 76, 257, 76],
  [428, 926, 170, 364, 382, 172, 76, 257, 76],
  [420, 912, 162, 344, 366, 160, 72, 234, 72],
  [414, 896, 169, 360, 379, 160, 72, 248, 76],
  [414, 736, 159, 348, 357, 170, 76, 248, 76],
  [402, 874, 162, 344, 366, 160, 72, 234, 72],
  [393, 852, 158, 338, 354, 160, 72, 234, 72],
  [390, 844, 158, 338, 354, 160, 72, 234, 72],
  [375, 812, 155, 329, 345, 157, 72, 225, 72],
  [360, 780, 155, 329, 345, 157, 72, 225, 72],
  [375, 667, 148, 321, 324, 153, 68, 225, 68],
];

/**
 * iPads (Apple's HIG canvas sizes): every iPad screen is bigger than every phone, so a phone row would be too
 * big. An unknown iPad gets the largest iPad row that fits, else the smallest. The Lock Screen keeps phone sizes.
 */
const IPAD_SIZES = [
  [1192, 1590, 188, 412, 412, 160, 72, 234, 72],
  [1032, 1376, 170, 378.5, 378.5, 160, 72, 234, 72],
  [1024, 1366, 170, 378.5, 378.5, 160, 72, 234, 72],
  [970, 1389, 162, 350, 350, 160, 72, 234, 72],
  [954, 1373, 162, 350, 350, 160, 72, 234, 72],
  [834, 1194, 155, 342, 342, 160, 72, 234, 72],
  [820, 1180, 155, 342, 342, 160, 72, 234, 72],
  [834, 1112, 150, 327.5, 327.5, 160, 72, 234, 72],
  [810, 1080, 146, 320.5, 320.5, 160, 72, 234, 72],
  [768, 1024, 141, 305.5, 305.5, 160, 72, 234, 72],
  [744, 1133, 141, 305.5, 305.5, 160, 72, 234, 72],
];

/** The no-payload lines: == lib/anime/widgetCopy.ts#WIDGET_FALLBACK_COPY (parity). */
const FALLBACK_COPY = {
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
/** The words a no-payload state still needs: == widgetCopy()'s (parity). */
const BASE_COPY = { tags: { Notice: "《Notice》", Report: "《Report》", Warning: "《Warning》" }, sep: " · " };
const STATE_LINE = {
  setup: "setup",
  "bad-link": "badLink",
  "not-found": "notFound",
  unreachable: "unreachable",
  unavailable: "unavailable",
  outdated: "outdated",
  error: "error",
};

// ─── Pure helpers (no Scriptable API; exported for the tests) ──────────────────

const isObj = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isStr = (value) => typeof value === "string";
const isNum = (value) => typeof value === "number" && Number.isFinite(value);

/** The Parameter field: `[<list link or id>] [glass]` (== lib/widget.ts#parseWidgetParameter). */
function parseParameter(raw) {
  const text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  const out = { id: null, glass: false, unknown: [], link: false };
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

/**
 * Which list this widget shows: the Parameter's id, else the in-app link; words but no id → bad-link. `source`
 * says where it came from: only Edit Widget can fix a Parameter (the app can't change it).
 */
function resolveTarget(param, saved) {
  const glass = Boolean(param.glass || (saved && saved.glass));
  if (param.id) return { kind: "id", id: param.id, glass, source: "param" };
  if (param.unknown.length) return { kind: "bad-link", glass, source: "param", link: param.link };
  if (saved && isStr(saved.id) && CANONICAL_ID.test(saved.id)) return { kind: "id", id: saved.id, glass, source: "config" };
  return { kind: "setup", glass, source: "config" };
}

/** == lib/widget.ts#widgetRowPhase. */
function rowPhase(at, nowMs) {
  const s = at - nowMs / 1000;
  if (s >= TIMER_S) return "far";
  if (s >= SOON_S) return "day";
  if (s > 0) return "soon";
  if (s >= -GRACE_S) return "aired";
  return "gone";
}

/** == pickWidgetRows. */
function pickRows(rows, nowMs, count) {
  const out = [];
  for (const row of rows) {
    if (out.length >= count) break;
    if (rowPhase(row.at, nowMs) !== "gone") out.push(row);
  }
  return out;
}

/** == widgetTickerRow. */
function tickerRow(rows, nowMs) {
  const visible = pickRows(rows, nowMs, 8);
  return visible.find((row) => rowPhase(row.at, nowMs) !== "aired") || visible[0] || null;
}

/** == widgetRowLines. */
function rowLines(row, phase, copy) {
  const S = copy.sep;
  const aired = phase === "aired";
  const head = aired ? copy.aired.toUpperCase() : copy.ticker.toUpperCase();
  const labelTail = row.label === "Next EP" ? "" : S + row.label.toUpperCase();
  return {
    line: aired ? row.label + S + copy.aired + " " + row.when : row.label + S + row.when,
    smallLabel: head,
    smallA: aired ? row.label + S + copy.aired + " " + row.day : row.label + S + row.day,
    smallB: row.time,
    rectLabel: head + labelTail,
    rectLine3: row.when,
    inline: aired ? copy.aired + " " + row.when + S + row.label + S + row.title : row.when + S + row.label + S + row.title,
    timer: phase === "day" || phase === "soon",
    tone: phase === "soon" ? "soon" : aired ? "aired" : "sage",
  };
}

const OUTCOME_CAP = {
  ok: REFRESH.okMs,
  fresh: REFRESH.okMs,
  saved: REFRESH.savedMs,
  offline: REFRESH.savedMs,
  error: REFRESH.savedMs,
  unavailable: REFRESH.savedMs,
  setup: REFRESH.idleMs,
  "bad-link": REFRESH.idleMs,
  "not-found": REFRESH.idleMs,
  outdated: REFRESH.outdatedMs,
};

/** The widget's refreshAfterDate (== widgetNextRefreshMs). */
function nextRefreshMs(shown, nowMs, outcome, hungrySince) {
  let next = nowMs + (OUTCOME_CAP[outcome] || REFRESH.savedMs);
  const consider = (seconds) => {
    if (seconds * 1000 > nowMs) next = Math.min(next, seconds * 1000 + REFRESH.slackMs);
  };
  for (const row of shown) {
    for (const boundary of [row.at - TIMER_S, row.at - SOON_S, row.at, row.at + GRACE_S]) consider(boundary);
  }
  if (isNum(hungrySince)) consider(hungrySince);
  return Math.max(next, nowMs + REFRESH.minMs);
}

/**
 * A Watching/Paused show has an aired episode not logged (== lib/widget.ts#widgetIsHungry): already, when
 * hungrySince is at or before the payload's generatedAt (whatever the phone's clock says), else from hungrySince.
 */
function isHungry(payload, nowMs) {
  if (!payload || !isNum(payload.hungrySince)) return false;
  return payload.hungrySince * 1000 <= payload.generatedAt || nowMs / 1000 >= payload.hungrySince;
}

/** The slime's mood for a view (HeroNextUp's resting slime is worried; the empty schedule's sage). */
function moodFor(view) {
  if (view.kind === "rows") return view.hungry ? "happy" : "idle";
  if (view.kind === "nothing-scheduled") return "sage";
  return "worried";
}

/**
 * The size row for a screen: an exact match, else the largest row that fits, else the smallest; iPads use the
 * iPad table (a phone row is bigger than any iPad's widgets).
 */
function sizeRow(screen, isPad) {
  const table = isPad ? IPAD_SIZES : SIZES;
  const w = screen && isNum(screen.width) ? screen.width : 0;
  const h = screen && isNum(screen.height) ? screen.height : 0;
  const s = Math.min(w, h);
  const l = Math.max(w, h);
  let floor = table[0];
  for (const row of table) if (row[2] < floor[2]) floor = row;
  if (!s) return floor;
  const exact = table.find((row) => row[0] === s && row[1] === l);
  if (exact) return exact;
  let best = null;
  for (const row of table) if (row[0] <= s && row[1] <= l && (!best || row[2] > best[2])) best = row;
  return best || floor;
}

/** Each family's layout numbers in points for this screen (every class fits with ≥ 4 pt slack: parity.test.ts). */
function metrics(family, screen, isPad) {
  const [, , small, mediumW, largeH, rectW, rectH, inlineW, circle] = sizeRow(screen, isPad);
  if (family === "medium") {
    const rowH = Math.floor((small - 22 - 18 - 3 - 22 - 4) / 2);
    const coverH = Math.min(56, rowH - 6);
    return { W: mediumW, H: small, pad: [11, 12, 11, 12], header: 18, footer: 22, rowH, coverH, coverW: Math.round((coverH * 40) / 56) };
  }
  if (family === "large") {
    const H = largeH;
    const perchH = H < 340 ? 36 : H < 375 ? 40 : 44;
    const cardH = H - 24 - 13 - 4 - 40 - 6 - perchH;
    const rowH = Math.floor((cardH - 54 - 4) / 3);
    const coverH = Math.min(56, rowH - 6);
    return { W: mediumW, H, pad: [12, 12, 12, 12], eyebrow: 13, sageBox: 40, perchH, cardH, rowH, coverH, coverW: Math.round((coverH * 40) / 56) };
  }
  if (family === "small") {
    const S = small;
    const tiny = S < 148; // the iPad minis and 10.2-inch
    const compact = S < 158;
    const coverW = tiny ? 24 : compact ? 26 : 30;
    const coverH = tiny ? 33 : compact ? 36 : 42;
    const titleLines = S < 162 ? 2 : 3;
    const timerFont = tiny ? 17 : S < 158 ? 18 : S < 166 ? 19 : 20;
    return {
      W: S,
      H: S,
      pad: [12, 12, 10, 12],
      label: 13,
      coverW,
      coverH,
      titleLines,
      coverRowH: Math.max(coverH, titleLines === 3 ? 47 : 31),
      whenH: 29,
      bottomH: tiny ? 28 : compact ? 30 : 34,
      timerFont,
      timerBox: { 17: 83, 18: 88, 19: 93, 20: 98 }[timerFont],
      slimeW: tiny ? 28 : compact ? 30 : 34,
      stateSlimeW: 40,
    };
  }
  if (family === "accessoryRectangular") return { W: rectW, H: rectH, pad: [4, 6, 4, 6], timerBox: 56, gap: 4 };
  if (family === "accessoryCircular") return { W: circle, H: circle, pad: [4, 4, 4, 4], glyphW: Math.round(circle * 0.55) };
  return { W: inlineW, H: 26, pad: null, glyphW: 14 };
}

const isLine = (line) =>
  isObj(line) && KINDS.includes(line.kind) && isStr(line.title) && isStr(line.inline) && (line.text === null || isStr(line.text));
const COPY_STRINGS = ["sep", "eyebrow", "sage", "title", "header", "headerNote", "ticker", "footer", "aired", "savedNote", "offline"];
const LINK_KEYS = ["schedule", "week", "list", "browse"];

/** Whether a fetched or saved body is a payload this script can draw (schema 1, our hosts only). */
function isPayload(p) {
  if (!isObj(p) || p.schema !== SCHEMA || !isNum(p.generatedAt) || !STATES.includes(p.state)) return false;
  if (!isObj(p.owner) || !isStr(p.owner.name) || !TIERS.includes(p.owner.tier) || !Array.isArray(p.rows)) return false;
  if (!isObj(p.links) || !LINK_KEYS.every((key) => isStr(p.links[key]) && p.links[key].startsWith(ORIGIN + "/"))) return false;
  if (!isObj(p.art) || !isStr(p.art.base) || !p.art.base.startsWith(ORIGIN + ART_PATH)) return false;
  if (!Number.isInteger(p.art.version) || p.art.version <= 0) return false;
  const c = p.copy;
  if (!isObj(c) || !COPY_STRINGS.every((key) => isStr(c[key]))) return false;
  if (!isObj(c.tags) || !KINDS.every((key) => isStr(c.tags[key]))) return false;
  return isLine(c.resting) && (c.state === null || isLine(c.state));
}

const clampInt = (value, min, max, fallback) => (Number.isInteger(value) && value >= min && value <= max ? value : fallback);
const pickLine = (line) => ({ kind: line.kind, title: line.title, text: line.text, inline: line.inline });

/** A cleaned copy of a valid payload: rows, hosts and tuning checked; unknown fields dropped (additive schema). */
function sanitizePayload(p) {
  const links = {};
  for (const key of LINK_KEYS) links[key] = p.links[key];
  const rows = [];
  for (const r of p.rows) {
    if (rows.length >= 8) break;
    if (!isObj(r) || !isNum(r.at) || !["title", "label", "day", "time", "when"].every((key) => isStr(r[key]))) continue;
    rows.push({
      id: isNum(r.id) ? r.id : 0,
      title: r.title,
      label: r.label,
      at: r.at,
      day: r.day,
      time: r.time,
      when: r.when,
      cover: isStr(r.cover) && r.cover.startsWith(COVER_PREFIX) ? r.cover : null,
      color: isStr(r.color) && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : null,
      url: isStr(r.url) && r.url.startsWith(ORIGIN + "/mylist/") ? r.url : links.schedule,
    });
  }
  const t = isObj(p.tuning) ? p.tuning : {};
  const s = isObj(p.script) ? p.script : {};
  const c = p.copy;
  const copy = { tags: { Notice: c.tags.Notice, Report: c.tags.Report, Warning: c.tags.Warning } };
  for (const key of COPY_STRINGS) copy[key] = c[key];
  // Added within v1: a payload without it falls back to the network line.
  copy.unavailable = isStr(c.unavailable) ? c.unavailable : c.offline;
  copy.resting = pickLine(c.resting);
  copy.state = c.state === null ? null : pickLine(c.state);
  return {
    schema: SCHEMA,
    generatedAt: p.generatedAt,
    state: p.state,
    owner: { name: p.owner.name, tier: p.owner.tier },
    hungrySince: isNum(p.hungrySince) ? p.hungrySince : null,
    rows,
    links,
    art: { version: p.art.version, base: p.art.base },
    script: {
      latest: Number.isInteger(s.latest) ? s.latest : SCRIPT_VERSION,
      source: isStr(s.source) && s.source.startsWith("https://github.com/") ? s.source : SOURCE_URL,
    },
    tuning: {
      jsonTimeoutS: isNum(t.jsonTimeoutS) ? Math.min(8, Math.max(2, t.jsonTimeoutS)) : JSON_TIMEOUT_S,
      coverFetches: clampInt(t.coverFetches, 0, MAX_COVERS, MAX_COVERS),
      largeSkyMaxScale: t.largeSkyMaxScale === 2 ? 2 : 3,
    },
    copy,
  };
}

/** An art file's name: sky-<family>-<scale>x, slime-<tier>[-happy], slime-worried, slime-sage, glyph-<tier>, glyph-worried. */
function artName(kind, opts) {
  if (kind === "sky") return "sky-" + opts.family + "-" + opts.scale + "x";
  if (kind === "glyph") return opts.mood === "worried" || !opts.tier ? "glyph-worried" : "glyph-" + opts.tier;
  if (opts.mood === "worried" || opts.mood === "sage" || !opts.tier) return opts.mood === "sage" ? "slime-sage" : "slime-worried";
  return "slime-" + opts.tier + (opts.mood === "happy" ? "-happy" : "");
}

const artFile = (name, version) => name + ".v" + version + ".png";

/** Every art name a phone of this density uses (the in-app prefetch). */
function artNamesFor(scale, largeCap) {
  const names = [
    artName("sky", { family: "small", scale }),
    artName("sky", { family: "medium", scale }),
    artName("sky", { family: "large", scale: Math.min(scale, largeCap || 3) }),
  ];
  for (const tier of TIERS) {
    names.push(artName("slime", { tier, mood: "idle" }), artName("slime", { tier, mood: "happy" }), artName("glyph", { tier }));
  }
  names.push(artName("slime", { mood: "worried" }), artName("slime", { mood: "sage" }), artName("glyph", { mood: "worried" }));
  return names;
}

/** 32-bit FNV-1a as hex (cover cache file names). */
function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const clipLog = (text, n) => String(text).slice(0, n);

const withQuery = (url, query) => url + (url.includes("?") ? "&" : "?") + query;

/** The newest art version among file names like "slime-worried.v2.png" (0: none). */
function newestArtVersion(names) {
  let newest = 0;
  for (const name of names) {
    const match = /\.v(\d+)\.png$/.exec(name);
    if (match) newest = Math.max(newest, Number(match[1]));
  }
  return newest;
}

// ─── The wall clock ───────────────────────────────────────────────────────────

/** What a raced wait resolves to when its time runs out. */
const TIMED_OUT = { timedOut: true };
/** A widget run's network budget ends here (Date.now() ms); the app has none (only each wait's own cap). */
let runDeadlineAt = Infinity;
const timeLeft = (capMs) => Math.min(capMs, runDeadlineAt - Date.now());

/**
 * `promise`, or TIMED_OUT after `ms` (Scriptable's Timer). Request has no cancel(): a losing load keeps going and
 * nobody reads it. Without a working Timer this is just `promise` (timeoutInterval still cuts off a stall).
 */
function raceDeadline(promise, ms) {
  if (!(ms > 0)) return Promise.resolve(TIMED_OUT);
  let timer = null;
  const late = new Promise((resolve) => {
    try {
      timer = Timer.schedule(ms, false, () => resolve(TIMED_OUT));
    } catch (_) {
      // no Timer here
    }
  });
  const stop = () => {
    try {
      if (timer) timer.invalidate();
    } catch (_) {
      // already fired
    }
  };
  return Promise.race([promise, late]).then(
    (value) => {
      stop();
      return value;
    },
    (err) => {
      stop();
      throw err;
    }
  );
}

// ─── IO: FileManager.local() documents (the only directory the app and the widget share) ─

let fm = null;
let netRequests = 0;
const files = () => fm || (fm = FileManager.local());

function paths() {
  const f = files();
  const dir = f.joinPath(f.documentsDirectory(), DIR);
  const art = f.joinPath(dir, "art");
  const covers = f.joinPath(dir, "covers");
  for (const d of [dir, art, covers]) if (!f.fileExists(d)) f.createDirectory(d, true);
  return {
    dir,
    art,
    covers,
    config: f.joinPath(dir, "config.json"),
    runs: f.joinPath(dir, "runs.json"),
    data: (id) => f.joinPath(dir, "data-" + id + ".json"),
  };
}

function readJSON(path) {
  const f = files();
  if (!f.fileExists(path)) return null;
  try {
    return JSON.parse(f.readString(path));
  } catch (e) {
    try {
      f.remove(path);
    } catch (_) {
      // already gone
    }
    return null;
  }
}

/** Write to a temp file, then move it over the target: an interrupted run never leaves half a file. */
function writeAtomic(path, write) {
  const f = files();
  const tmp = path + "." + UUID.string() + ".tmp";
  write(tmp);
  f.move(tmp, path);
}

const writeJSONAtomic = (path, value) => writeAtomic(path, (tmp) => files().writeString(tmp, JSON.stringify(value)));

function readConfig() {
  const c = readJSON(paths().config);
  return {
    id: isObj(c) && isStr(c.id) && CANONICAL_ID.test(c.id) ? c.id : null,
    glass: isObj(c) && c.glass === true,
    name: isObj(c) && isStr(c.name) ? c.name : null,
    /** The newest art version a payload named: the no-payload states draw with it (the server serves only it). */
    artVersion: isObj(c) && Number.isInteger(c.artVersion) && c.artVersion > 0 ? c.artVersion : null,
  };
}

/** Merge `patch` into config.json; a new id without a name drops the old list's name. */
function writeConfig(patch) {
  const current = readConfig();
  const c = { ...current, ...patch };
  if ("id" in patch && patch.id !== current.id && !("name" in patch)) c.name = null;
  writeJSONAtomic(paths().config, { id: c.id, glass: Boolean(c.glass), name: c.name || null, artVersion: c.artVersion || null });
}

/** The art version for a view with no payload: the last one a payload named, else what's cached, else the default. */
function stateArtVersion() {
  return readConfig().artVersion || newestArtVersion(files().listContents(paths().art)) || ART_VERSION_FALLBACK;
}

function readSaved(id) {
  const path = paths().data(id);
  const saved = readJSON(path);
  if (!saved) return null;
  if (isObj(saved) && isNum(saved.savedAt) && isPayload(saved.payload)) {
    return { savedAt: saved.savedAt, payload: sanitizePayload(saved.payload) };
  }
  try {
    files().remove(path);
  } catch (_) {
    // already gone
  }
  return null;
}

function savePayload(id, payload) {
  writeJSONAtomic(paths().data(id), { savedAt: Date.now(), payload });
  if (readConfig().artVersion !== payload.art.version) writeConfig({ artVersion: payload.art.version });
}

function removeSaved(id) {
  const path = paths().data(id);
  if (files().fileExists(path)) files().remove(path);
}

/**
 * GET the payload: loadString + statusCode (loadJSON hides HTTP errors and throws on HTML). A 404 or 410 counts
 * only with the route's own JSON body: another page (a rollback, a platform error) is "server", so the saved copy
 * stays. "unavailable" is the route's own 5xx. Both got an HTTP reply over HTTPS, normally kylevb.com's (a captive
 * portal fails the TLS handshake: "network"; only a TLS-inspecting filter the phone trusts can answer instead).
 */
async function fetchPayload(id, timeoutS) {
  const req = new Request(ORIGIN + API_PATH + id);
  req.timeoutInterval = timeoutS;
  req.headers = { Accept: "application/json" };
  netRequests += 1;
  let body;
  try {
    body = await raceDeadline(req.loadString(), timeLeft(timeoutS * 1000));
  } catch (e) {
    return { kind: "network" };
  }
  if (body === TIMED_OUT) return { kind: "network" };
  const status = (req.response && req.response.statusCode) || 0;
  let json = null;
  if (typeof body === "string" && body.length <= MAX_BODY_CHARS) {
    try {
      json = JSON.parse(body);
    } catch (_) {
      json = null;
    }
  }
  if (status === 200 && isPayload(json)) return { kind: "ok", payload: sanitizePayload(json) };
  const routeError = status !== 200 && isObj(json) && json.schema === SCHEMA && isStr(json.error) ? json.error : null;
  if (status === 404 && routeError === "not-found") return { kind: "not-found" };
  if (status >= 500 && routeError === "unavailable") return { kind: "unavailable", status };
  if (status === 410 && routeError === "outdated") {
    return {
      kind: "outdated",
      message: isObj(json) && isStr(json.message) && json.message.length <= 120 ? json.message : null,
      url: isObj(json) && isStr(json.url) && json.url.startsWith("https://github.com/") ? json.url : SOURCE_URL,
    };
  }
  // `page`: an HTML page, which kylevb.com's route never sends with a 2xx.
  return { kind: "server", status, page: typeof body === "string" && /^\s*</.test(body) };
}

/** A cached image, else (when allowed) load() + Image.fromData() (loadImage downscales to 500 px in widgets). */
async function loadImageFile(url, path, mayFetch, inApp) {
  const f = files();
  if (f.fileExists(path)) {
    const cached = Image.fromFile(path);
    if (cached) return { image: cached, fetched: false };
    try {
      f.remove(path);
    } catch (_) {
      // already gone
    }
  }
  const left = timeLeft((inApp ? APP_IMAGE_CAP_S : IMAGE_TIMEOUT_S) * 1000);
  if (!mayFetch || left <= 0) return { image: null, fetched: false };
  netRequests += 1;
  try {
    const req = new Request(url);
    req.timeoutInterval = inApp ? APP_TIMEOUT_S : IMAGE_TIMEOUT_S;
    const data = await raceDeadline(req.load(), left);
    if (data === TIMED_OUT) return { image: null, fetched: true };
    if (!req.response || req.response.statusCode !== 200) return { image: null, fetched: true };
    const image = Image.fromData(data);
    if (!image) return { image: null, fetched: true };
    writeAtomic(path, (tmp) => f.write(tmp, data));
    return { image, fetched: true };
  } catch (e) {
    return { image: null, fetched: true };
  }
}

async function loadArt(name, art, startedAt, inApp) {
  const p = paths();
  const file = artFile(name, art.version);
  const mayFetch = inApp || Date.now() - startedAt < ART_BEFORE_MS;
  const r = await loadImageFile(art.base + file, files().joinPath(p.art, file), mayFetch, inApp);
  if (r.image) return r;
  // Neither cached nor fetched: the same picture in another cached version beats none (a stored copy drawn
  // offline after an art bump another list's payload named). The next run in the fetch window upgrades it.
  let best = 0;
  for (const cached of files().listContents(p.art)) {
    const match = /^(.+)\.v(\d+)\.png$/.exec(cached);
    if (match && match[1] === name && Number(match[2]) > best) best = Number(match[2]);
  }
  const image = best ? Image.fromFile(files().joinPath(p.art, artFile(name, best))) : null;
  return image ? { image, fetched: r.fetched } : r;
}

const coverPath = (row) => files().joinPath(paths().covers, row.id + "-" + fnv1a(row.cover) + ".img");

/** Covers for the shown rows: cached ones always, at most `max` downloads, only early in a widget run. */
async function loadCovers(rows, startedAt, max, inApp) {
  const covers = new Map();
  let fetched = 0;
  let budget = max;
  const mayFetch = inApp || Date.now() - startedAt < COVERS_BEFORE_MS;
  const jobs = rows
    .filter((row) => row.cover)
    .map((row) => {
      const path = coverPath(row);
      const cached = files().fileExists(path);
      const allowed = cached || (mayFetch && budget-- > 0);
      return loadImageFile(row.cover, path, allowed && !cached ? true : false, inApp).then((r) => {
        if (r.fetched) fetched += 1;
        if (r.image) covers.set(row.id, r.image);
      });
    });
  await Promise.all(jobs);
  return { covers, fetched };
}

/** Every cover path a payload can show (its rows rotate in as earlier ones air). */
const coverPaths = (payload) => (payload ? payload.rows.filter((row) => row.cover).map(coverPath) : []);

/**
 * Keep the cover cache under COVER_CACHE_MAX files, oldest download first, never deleting a cover in `keep` (the
 * running payload's rows) or one a saved list under a week old can show (another widget's Parameter list, the
 * in-app link): a cache hit doesn't touch a file's date, so a long runner's cover is always among the oldest.
 */
function evictCovers(keep) {
  const f = files();
  const p = paths();
  const dir = p.covers;
  const names = f.listContents(dir);
  if (names.length <= COVER_CACHE_MAX) return;
  const kept = new Set(keep || []);
  for (const name of f.listContents(p.dir)) {
    const match = /^data-([0-9a-f]{24})\.json$/.exec(name);
    const saved = match ? readSaved(match[1]) : null;
    if (saved && Date.now() - saved.payload.generatedAt < SAVED_MAX_AGE_MS) {
      for (const path of coverPaths(saved.payload)) kept.add(path);
    }
  }
  const dated = names
    .map((name) => {
      const path = f.joinPath(dir, name);
      const date = f.modificationDate(path);
      return { path, t: kept.has(path) ? Infinity : date ? date.getTime() : 0 };
    })
    .sort((a, b) => a.t - b.t)
    .filter((item) => item.t !== Infinity);
  for (const { path } of dated.slice(0, Math.max(0, names.length - COVER_CACHE_KEEP))) {
    try {
      f.remove(path);
    } catch (_) {
      // already gone
    }
  }
}

/**
 * In-app: every art file this phone uses, then drop stale temp files and other versions of each picture whose
 * current version arrived (one that didn't download keeps its older version for loadArt's fallback).
 */
async function prefetchArt(art, scale, largeCap) {
  const f = files();
  const p = paths();
  const names = artNamesFor(scale, largeCap);
  await Promise.all(names.map((name) => loadArt(name, art, Date.now(), true)));
  const keep = new Set(names.map((name) => artFile(name, art.version)));
  for (const name of f.listContents(p.art)) {
    const path = f.joinPath(p.art, name);
    const match = /^(.+)\.v(\d+)\.png$/.exec(name);
    const otherVersion = Boolean(match) && Number(match[2]) !== art.version && f.fileExists(f.joinPath(p.art, artFile(match[1], art.version)));
    if (otherVersion || (!keep.has(name) && name.endsWith(".tmp") && isOld(path))) {
      try {
        f.remove(path);
      } catch (_) {
        // already gone
      }
    }
  }
  for (const name of f.listContents(p.dir)) {
    const path = f.joinPath(p.dir, name);
    if (name.endsWith(".tmp") && isOld(path)) {
      try {
        f.remove(path);
      } catch (_) {
        // already gone
      }
    }
  }
  return names.filter((name) => f.fileExists(f.joinPath(p.art, artFile(name, art.version)))).length;
}

function isOld(path) {
  const date = files().modificationDate(path);
  return !date || Date.now() - date.getTime() > 3600000;
}

function appendRunLog(entry) {
  const p = paths();
  const runs = readJSON(p.runs);
  const list = Array.isArray(runs) ? runs : [];
  list.push(entry);
  writeJSONAtomic(p.runs, list.slice(-RUN_LOG_MAX));
}

/** Remove everything the script saved except the linked list. */
function clearSaved() {
  const f = files();
  const p = paths();
  for (const name of f.listContents(p.dir)) {
    if (name === "config.json") continue;
    try {
      f.remove(f.joinPath(p.dir, name));
    } catch (_) {
      // already gone
    }
  }
  paths();
}

function screenSize() {
  try {
    const s = Device.screenSize();
    return { width: s.width, height: s.height };
  } catch (e) {
    return { width: 0, height: 0 };
  }
}

function screenScale() {
  try {
    return Device.screenScale() >= 3 ? 3 : 2;
  } catch (e) {
    return 3;
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

const isAccessory = (family) => family.startsWith("accessory");

/** A color token for this view: the site's, glass (Color.dynamic) or the Lock Screen's opaque grays. */
function tone(view, name) {
  if (view.glass && T.glass[name]) {
    const [light, dark] = T.glass[name];
    const make = (v) => (Array.isArray(v) ? new Color(v[0], v[1]) : new Color(v));
    return Color.dynamic(make(light), make(dark));
  }
  const v = T[name];
  return Array.isArray(v) ? new Color(v[0], v[1]) : new Color(v);
}

const mono = (weight, size) => (weight === "semibold" ? Font.semiboldMonospacedSystemFont(size) : Font.regularMonospacedSystemFont(size));

function addText(stack, text, font, color, opts) {
  const t = stack.addText(text);
  t.font = font;
  t.textColor = color;
  if (opts && opts.lineLimit) t.lineLimit = opts.lineLimit;
  if (opts && opts.minScale) t.minimumScaleFactor = opts.minScale;
  return t;
}

/** A horizontal stack of a fixed height; callers end it with a flexible spacer so it spans the width. */
function addFullRow(parent, height) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.size = new Size(0, height);
  return row;
}

function addHairline(parent, color) {
  const line = parent.addStack();
  line.size = new Size(0, 1);
  line.backgroundColor = color;
  line.addSpacer(null);
  return line;
}

function addDot(stack, color) {
  const dot = stack.addStack();
  dot.size = new Size(6, 6);
  dot.cornerRadius = 3;
  dot.backgroundColor = color;
  return dot;
}

/** The only live date: a timer alone in a fixed-width stack, last on its line (it expands to fill its box). */
function addTimer(stack, at, font, color, width) {
  const box = stack.addStack();
  box.size = new Size(width, 0);
  const date = box.addDate(new Date(at * 1000));
  date.applyTimerStyle();
  date.font = font;
  date.textColor = color;
  date.lineLimit = 1;
  return box;
}

function addCover(stack, row, image, w, h) {
  const box = stack.addStack();
  box.size = new Size(w, h);
  box.cornerRadius = 4;
  box.backgroundColor = new Color(row.color || T.coverFallback);
  if (image) {
    const img = box.addImage(image);
    img.imageSize = new Size(w, h);
    img.applyFillingContentMode();
    img.cornerRadius = 4;
  }
  return box;
}

/** The slime sprite (or, in glass and on the Lock Screen, its glyph), sized by height or width in points. */
function addSlime(stack, view, size, url) {
  const image = view.art.slime;
  if (!image) return null;
  const aspect = image.size.height / image.size.width;
  const w = size.w || size.h / aspect;
  const img = stack.addImage(image);
  img.imageSize = new Size(Math.round(w), Math.round(w * aspect));
  if (view.glass) img.tintColor = tone(view, "glyphTint");
  if (url && (view.family === "medium" || view.family === "large")) img.url = url;
  return img;
}

function newWidget(view) {
  const w = new ListWidget();
  w.spacing = 0;
  const pad = view.m.pad;
  if (pad) w.setPadding(pad[0], pad[1], pad[2], pad[3]);
  if (!isAccessory(view.family) && !view.glass) {
    w.backgroundColor = new Color(T.skyBase);
    if (view.art.sky) {
      w.backgroundImage = view.art.sky;
    } else {
      const g = new LinearGradient();
      g.colors = T.skyStops.map((stop) => new Color(stop[0]));
      g.locations = T.skyStops.map((stop) => stop[1]);
      g.startPoint = new Point(0, 0);
      g.endPoint = new Point(0, 1);
      w.backgroundGradient = g;
    }
  }
  if (view.family === "accessoryCircular") w.addAccessoryWidgetBackground = true;
  if (view.tapUrl) w.url = view.tapUrl;
  return w;
}

/**
 * The Next-episodes card's header: 《Notice》 Next episodes · Pacific Time, or the saved copy's stamp. The large
 * card always keeps "Pacific Time" (`stamp` false): its saved rows' Sage line names the saved time, and the large
 * saved state draws the stamp on a row of its own (beside "Next episodes" it would be cut on 305.5 pt widgets).
 */
function cardHeader(parent, view, height, padX, stamp) {
  const { copy } = view;
  const header = addFullRow(parent, height);
  header.centerAlignContent();
  if (padX) header.setPadding(0, padX, 0, padX);
  header.url = view.links.schedule;
  const stamped = view.saved && stamp;
  addText(header, copy.tags.Notice, mono("semibold", 11), tone(view, "sage"));
  header.addSpacer(6);
  addText(header, copy.header, mono("semibold", 11), tone(view, "console"), { lineLimit: 1 });
  header.addSpacer(null);
  // A fixed gap: a flexible spacer's minimum length isn't documented.
  header.addSpacer(4);
  if (stamped) addText(header, copy.savedNote, Font.regularSystemFont(11), tone(view, "muted"), { lineLimit: 1, minScale: 0.75 });
  else addText(header, copy.headerNote, mono("regular", 11), tone(view, "muted"), { lineLimit: 1 });
  return header;
}

/** One card row: the cover, the title and "EP 13 · Thu 9:30 AM PT" with a timer within a day. */
function cardRow(parent, view, shown, padX) {
  const { m } = view;
  const row = addFullRow(parent, m.rowH);
  row.centerAlignContent();
  if (padX) row.setPadding(0, padX, 0, padX);
  if (!shown) {
    row.addSpacer(null);
    return row;
  }
  const r = shown.row;
  const lines = shown.lines;
  row.url = r.url;
  if (!view.glass) {
    addCover(row, r, view.covers.get(r.id), m.coverW, m.coverH);
    row.addSpacer(10);
  }
  const col = row.addStack();
  col.layoutVertically();
  const titleRow = col.addStack();
  addText(titleRow, r.title, Font.semiboldSystemFont(14), tone(view, "title"), { lineLimit: 1 });
  titleRow.addSpacer(null);
  col.addSpacer(2);
  const line = col.addStack();
  line.centerAlignContent();
  const soon = lines.tone === "soon";
  if (soon) addDot(line, tone(view, "soonDot"));
  if (lines.tone === "aired") addDot(line, tone(view, "airedDot"));
  if (lines.tone !== "sage") line.addSpacer(4);
  const color = tone(view, soon ? "soonText" : "sage");
  addText(line, lines.line, Font.semiboldSystemFont(12), color, { lineLimit: 1, minScale: 0.8 });
  line.addSpacer(null);
  if (lines.timer) {
    // A fixed gap too: a flexible spacer's minimum length is Scriptable's to choose.
    line.addSpacer(4);
    addTimer(line, r.at, Font.semiboldMonospacedSystemFont(12), color, 60);
  }
  return row;
}

function renderMedium(view) {
  const { copy, links } = view;
  const w = newWidget(view);
  cardHeader(w, view, view.m.header, 0, true);
  addHairline(w, tone(view, "hairline"));
  // Dividers only between real rows, as the card's divide-y: an empty slot keeps its height, unruled.
  for (let i = 0; i < 2; i++) {
    if (i === 1 && view.rows[1]) addHairline(w, tone(view, "hairline"));
    else if (i === 1) w.addSpacer(1);
    cardRow(w, view, view.rows[i], 0);
  }
  w.addSpacer(null);
  addHairline(w, tone(view, "hairline"));
  const footer = addFullRow(w, view.m.footer);
  footer.bottomAlignContent();
  const link = footer.addStack();
  link.centerAlignContent();
  link.url = links.week;
  addText(link, copy.footer, Font.mediumSystemFont(13), tone(view, "sage"));
  footer.addSpacer(null);
  addSlime(footer, view, { h: 22 }, links.list);
  return w;
}

/** The Airing Schedule banner on top of the large widget: eyebrow, the Sage box, the h1 with the perched slime. */
function largeBanner(w, view, line) {
  const { copy, links, m } = view;
  const top = w.addStack();
  top.layoutVertically();
  if (view.payload) {
    top.url = links.schedule;
    const eb = addFullRow(top, m.eyebrow);
    addText(eb, copy.eyebrow.toUpperCase(), mono("semibold", 11), tone(view, "sage"), { lineLimit: 1, minScale: 0.8 });
    eb.addSpacer(null);
    top.addSpacer(4);
  }
  const sage = addFullRow(top, m.sageBox);
  sage.topAlignContent();
  sage.cornerRadius = 6;
  sage.borderWidth = 1;
  sage.borderColor = tone(view, "sageBorder");
  sage.setPadding(5, 8, 5, 8);
  // The saved-copy line names air times, so only saved rows get it; a saved state keeps the standing line, and
  // renderStateLarge draws its stamp on a row under the card header.
  const savedRows = view.payload && view.saved && view.kind === "rows";
  const offline = view.savedReason === "unavailable" ? copy.unavailable : copy.offline;
  const tag = view.payload ? (savedRows ? copy.tags.Report : copy.tags.Notice) : copy.tags[line.kind];
  const sentence = view.payload ? (savedRows ? offline : copy.sage) : line.title;
  addText(sage, tag, mono("semibold", 11), tone(view, "sage"));
  sage.addSpacer(4);
  // 0.75: SF Mono is 1266/2048 em wide, so the narrowest large widget (305.5 pt) fits the saved lines' longest
  // stamps and SAGE_NAME_MAX in two lines whatever a flexible spacer's minimum is. Wider widgets keep a larger scale.
  addText(sage, sentence, mono("regular", 11), tone(view, "console"), { lineLimit: 2, minScale: 0.75 });
  sage.addSpacer(null);
  w.addSpacer(6);
  const perch = addFullRow(w, m.perchH);
  perch.bottomAlignContent();
  if (view.payload) {
    const h1 = addText(perch, copy.title, Font.blackSystemFont(20), tone(view, "h1"), { lineLimit: 1, minScale: 0.7 });
    h1.url = links.schedule;
  }
  perch.addSpacer(null);
  addSlime(perch, view, { h: m.perchH }, view.payload ? links.list : null);
}

function largeCard(w, view) {
  const card = w.addStack();
  card.layoutVertically();
  card.size = new Size(0, 54 + 3 * view.m.rowH);
  card.cornerRadius = 12;
  card.borderWidth = 1;
  card.borderColor = tone(view, "cardBorder");
  return card;
}

function renderLarge(view) {
  const { copy, links } = view;
  const w = newWidget(view);
  largeBanner(w, view, null);
  const card = largeCard(w, view);
  cardHeader(card, view, 24, 10, false);
  addHairline(card, tone(view, "hairline"));
  for (let i = 0; i < 3; i++) {
    // The card's height is fixed (54 + 3 × rowH): an empty slot keeps its 1 pt, unruled.
    if (i > 0 && view.rows[i]) addHairline(card, tone(view, "hairline"));
    else if (i > 0) card.addSpacer(1);
    cardRow(card, view, view.rows[i], 10);
  }
  addHairline(card, tone(view, "hairline"));
  const cf = addFullRow(card, 24);
  cf.centerAlignContent();
  cf.setPadding(0, 10, 0, 10);
  cf.url = links.week;
  addText(cf, copy.footer, Font.mediumSystemFont(13), tone(view, "sage"));
  cf.addSpacer(null);
  w.addSpacer(null);
  return w;
}

function renderSmall(view) {
  const { copy, m } = view;
  const shown = view.rows[0];
  const r = shown.row;
  const lines = shown.lines;
  const w = newWidget(view);
  const lab = addFullRow(w, m.label);
  if (view.saved) addText(lab, copy.savedNote, Font.regularSystemFont(11), tone(view, "muted"), { lineLimit: 1, minScale: 0.75 });
  else addText(lab, lines.smallLabel, mono("semibold", 11), tone(view, "sage"), { lineLimit: 1 });
  lab.addSpacer(null);
  w.addSpacer(4);
  const cr = addFullRow(w, m.coverRowH);
  cr.topAlignContent();
  if (!view.glass) {
    addCover(cr, r, view.covers.get(r.id), m.coverW, m.coverH);
    cr.addSpacer(8);
  }
  addText(cr, r.title, Font.semiboldSystemFont(13), tone(view, "title"), { lineLimit: m.titleLines });
  cr.addSpacer(null);
  w.addSpacer(null);
  const soon = lines.tone === "soon";
  const color = tone(view, soon ? "soonText" : "sage");
  const a = w.addStack();
  a.centerAlignContent();
  if (soon) addDot(a, tone(view, "soonDot"));
  if (lines.tone === "aired") addDot(a, tone(view, "airedDot"));
  if (lines.tone !== "sage") a.addSpacer(4);
  addText(a, lines.smallA, Font.semiboldSystemFont(12), color, { lineLimit: 1, minScale: 0.7 });
  a.addSpacer(null);
  const b = w.addStack();
  addText(b, lines.smallB, Font.semiboldSystemFont(12), color, { lineLimit: 1 });
  b.addSpacer(null);
  w.addSpacer(2);
  const bot = addFullRow(w, m.bottomH);
  bot.bottomAlignContent();
  if (lines.timer) addTimer(bot, r.at, Font.semiboldMonospacedSystemFont(m.timerFont), color, m.timerBox);
  bot.addSpacer(null);
  addSlime(bot, view, { w: m.slimeW }, null);
  return w;
}

function renderRect(view) {
  const shown = view.rows[0];
  const r = shown.row;
  const lines = shown.lines;
  const w = newWidget(view);
  w.addSpacer(null);
  const l1 = w.addStack();
  addText(l1, lines.rectLabel, mono("semibold", 11), new Color(T.lockPrimary), { lineLimit: 1, minScale: 0.8 });
  l1.addSpacer(null);
  w.addSpacer(2);
  const l2 = w.addStack();
  addText(l2, r.title, Font.semiboldSystemFont(15), new Color(T.lockPrimary), { lineLimit: 1 });
  l2.addSpacer(null);
  w.addSpacer(2);
  const l3 = w.addStack();
  l3.centerAlignContent();
  addText(l3, lines.rectLine3, Font.semiboldSystemFont(11), new Color(T.lockSecondary), { lineLimit: 1, minScale: 0.75 });
  l3.addSpacer(null);
  if (lines.timer) {
    // A fixed gap: "Thu 10:05 AM PT" must never run into "3:00:00" on the narrowest Lock Screens.
    l3.addSpacer(view.m.gap);
    addTimer(l3, r.at, Font.semiboldMonospacedSystemFont(11), new Color(T.lockPrimary), view.m.timerBox);
  }
  w.addSpacer(null);
  return w;
}

/** Inline: exactly one image and one static text; the system sets the font, color and truncation. */
function renderInline(view, text) {
  const w = newWidget(view);
  const glyph = view.art.slime;
  if (glyph) {
    const img = w.addImage(glyph);
    img.imageSize = new Size(view.m.glyphW, Math.round((view.m.glyphW * glyph.size.height) / glyph.size.width));
  }
  w.addText(text);
  return w;
}

/** Circular: the nav's brand mark as a launcher (no countdown: a 68 pt circle has no room for the time beside it). */
function renderCircular(view) {
  const w = newWidget(view);
  w.addSpacer(null);
  const row = w.addStack();
  row.addSpacer(null);
  const glyph = view.art.slime;
  if (glyph) {
    const img = row.addImage(glyph);
    const gw = view.m.glyphW;
    img.imageSize = new Size(gw, Math.round((gw * glyph.size.height) / glyph.size.width));
  } else {
    addText(row, "kylevb", Font.semiboldSystemFont(12), new Color(T.lockPrimary));
  }
  row.addSpacer(null);
  w.addSpacer(null);
  return w;
}

// State renderings: a Great Sage tag, a title and a line (§4.11).

function renderStateSmall(view, line) {
  const w = newWidget(view);
  const tag = addFullRow(w, view.m.label);
  addText(tag, view.copy.tags[line.kind], mono("semibold", 11), tone(view, "sage"));
  tag.addSpacer(null);
  w.addSpacer(4);
  const t = w.addStack();
  addText(t, line.title, Font.semiboldSystemFont(14), tone(view, "title"), { lineLimit: 3 });
  t.addSpacer(null);
  w.addSpacer(null);
  const bot = w.addStack();
  bot.addSpacer(null);
  addSlime(bot, view, { w: view.m.stateSlimeW }, null);
  return w;
}

function stateBody(parent, view, line, withSlime) {
  const body = parent.addStack();
  body.layoutHorizontally();
  body.centerAlignContent();
  body.setPadding(0, 4, 0, 4);
  if (withSlime && addSlime(body, view, { h: 44 }, null)) body.addSpacer(10);
  const col = body.addStack();
  col.layoutVertically();
  const tag = col.addStack();
  addText(tag, view.copy.tags[line.kind], mono("semibold", 11), tone(view, "sage"));
  tag.addSpacer(null);
  col.addSpacer(2);
  const title = col.addStack();
  addText(title, line.title, Font.semiboldSystemFont(14), tone(view, "title"), { lineLimit: 2 });
  title.addSpacer(null);
  if (line.text) {
    col.addSpacer(2);
    const text = col.addStack();
    addText(text, line.text, Font.regularSystemFont(12), tone(view, "soft"), { lineLimit: 2, minScale: 0.9 });
    text.addSpacer(null);
  }
  // No trailing spacer: the column already spans (its rows end in spacers), and a second flexible
  // element would take half the row.
  return body;
}

function renderStateMedium(view, line) {
  const w = newWidget(view);
  if (view.payload) {
    cardHeader(w, view, view.m.header, 0, true);
    addHairline(w, tone(view, "hairline"));
  }
  w.addSpacer(null);
  stateBody(w, view, line, true);
  w.addSpacer(null);
  return w;
}

function renderStateLarge(view, line) {
  const w = newWidget(view);
  largeBanner(w, view, line);
  const card = largeCard(w, view);
  if (view.payload) {
    // No air times here, so the Sage box keeps the standing line and the header stays the card's own. A saved
    // copy's stamp gets a full-width row: on the narrowest large widgets it doesn't fit beside "Next episodes"
    // (SwiftUI sizes the least flexible text first, so the stamp would be the one cut).
    cardHeader(card, view, 24, 10, false);
    addHairline(card, tone(view, "hairline"));
    if (view.saved) {
      const stamp = addFullRow(card, 20);
      stamp.centerAlignContent();
      stamp.setPadding(0, 10, 0, 10);
      addText(stamp, view.copy.savedNote, Font.regularSystemFont(11), tone(view, "muted"), { lineLimit: 1, minScale: 0.75 });
      stamp.addSpacer(null);
    }
  }
  card.addSpacer(null);
  const bodyLine = view.payload ? line : { kind: line.kind, title: "", text: line.text, inline: line.inline };
  const body = card.addStack();
  body.setPadding(0, 10, 0, 10);
  if (view.payload) {
    stateBody(body, view, bodyLine, false);
  } else {
    addText(body, line.text || line.title, Font.regularSystemFont(13), tone(view, "soft"), { lineLimit: 3, minScale: 0.9 });
    body.addSpacer(null);
  }
  card.addSpacer(null);
  w.addSpacer(null);
  return w;
}

function renderStateRect(view, line) {
  const w = newWidget(view);
  w.addSpacer(null);
  const l1 = w.addStack();
  addText(l1, view.copy.tags[line.kind], mono("semibold", 11), new Color(T.lockPrimary), { lineLimit: 1 });
  l1.addSpacer(null);
  w.addSpacer(2);
  const l2 = w.addStack();
  addText(l2, line.title, Font.semiboldSystemFont(14), new Color(T.lockPrimary), { lineLimit: 2, minScale: 0.85 });
  l2.addSpacer(null);
  w.addSpacer(null);
  return w;
}

function render(view) {
  const line = view.line;
  const family = view.family;
  if (family === "accessoryCircular") return renderCircular(view);
  if (family === "accessoryInline") return renderInline(view, line ? line.inline : view.rows[0].lines.inline);
  if (line) {
    if (family === "small") return renderStateSmall(view, line);
    if (family === "medium") return renderStateMedium(view, line);
    if (family === "large") return renderStateLarge(view, line);
    return renderStateRect(view, line);
  }
  if (family === "small") return renderSmall(view);
  if (family === "medium") return renderMedium(view);
  if (family === "large") return renderLarge(view);
  return renderRect(view);
}

/**
 * A no-payload state's tap. From a Parameter (`source: "param"`), the app is told which part is wrong: words it
 * doesn't use, a link that isn't a list link, or a list kylevb.com doesn't have; a refresh of that list says a
 * missing list is fixed in Edit Widget. An error over a Parameter that names no list is that Parameter's problem.
 */
function stateTap(kind, e) {
  const run = URLScheme.forRunningScript();
  const fromParam = e.source === "param";
  if (kind === "outdated") return e.url || SOURCE_URL;
  const setup = kind === "error" && fromParam && !e.id ? "bad-link" : kind;
  if (setup === "setup" || setup === "bad-link" || setup === "not-found") {
    const why = setup === "bad-link" ? (e.link ? "link" : "words") : "missing";
    return withQuery(run, "kv=setup" + (fromParam ? "&from=param&why=" + why : ""));
  }
  return withQuery(run, "kv=refresh" + (e.id ? "&id=" + e.id : "") + (e.id && fromParam ? "&from=param" : ""));
}

/** A widget that can't fail: shown if even the error state's rendering throws. */
function bareErrorWidget(family, e) {
  const w = new ListWidget();
  if (!isAccessory(family)) w.backgroundColor = new Color(T.skyBase);
  w.url = stateTap("error", e);
  w.addText(isAccessory(family) ? FALLBACK_COPY.error.inline : FALLBACK_COPY.error.title);
  return w;
}

// ─── Views ────────────────────────────────────────────────────────────────────

function familyFromConfig() {
  const family = config.widgetFamily;
  if (family === "extraLarge") return "large";
  if (FAMILIES.includes(family)) return family;
  return config.runsInAccessoryWidget ? "accessoryRectangular" : "small";
}

function isPad() {
  try {
    return Device.isPad() === true;
  } catch (e) {
    return false;
  }
}

/** Load the view's sky and slime (only what this family draws; missing art is fetched only early in a run). */
async function loadViewArt(view, art, tier, tuning) {
  const out = { sky: null, slime: null };
  const accessory = isAccessory(view.family);
  if (view.family === "accessoryRectangular") return out;
  const mood = moodFor(view);
  const glyph = view.glass || accessory;
  const name = glyph
    ? artName("glyph", { tier: mood === "worried" ? null : tier, mood: mood === "worried" ? "worried" : "idle" })
    : artName("slime", { tier: mood === "worried" || mood === "sage" ? null : tier, mood });
  const jobs = [loadArt(name, art, view.startedAt, view.inApp).then((r) => (out.slime = r.image))];
  if (!accessory && !view.glass) {
    const cap = view.family === "large" && tuning ? tuning.largeSkyMaxScale : 3;
    const sky = artName("sky", { family: view.family, scale: Math.min(view.scale, cap) });
    jobs.push(loadArt(sky, art, view.startedAt, view.inApp).then((r) => (out.sky = r.image)));
  }
  await Promise.all(jobs);
  return out;
}

function baseView(ctx) {
  return {
    family: ctx.family,
    glass: ctx.glass,
    startedAt: ctx.startedAt,
    inApp: ctx.inApp,
    screen: ctx.screen,
    scale: ctx.scale,
    m: metrics(ctx.family, ctx.screen, ctx.pad),
    /** The one clock reading the view is drawn at: its phases and its refresh boundaries. */
    now: Date.now(),
    payload: null,
    copy: BASE_COPY,
    saved: false,
    /** Why a saved copy is shown: "offline" (no schedule from kylevb.com) or "unavailable" (it answered without one). */
    savedReason: null,
    rows: [],
    hungry: false,
    line: null,
    links: { schedule: "", week: "", list: "", browse: "" },
    art: { sky: null, slime: null },
    covers: new Map(),
    keepCovers: [],
    tapUrl: null,
    outcome: "error",
    fetched: 0,
  };
}

/**
 * A no-payload state: setup, bad-link, not-found, unreachable, unavailable, outdated or error. `source: "param"`
 * means this widget's Parameter caused it: only Edit Widget fixes that, so the line and the tap say so.
 */
async function stateView(ctx, kind, extra) {
  const view = baseView(ctx);
  const e = extra || {};
  const fromParam = e.source === "param";
  view.kind = kind;
  view.outcome = e.outcome || kind;
  const fallback = kind === "not-found" && fromParam ? FALLBACK_COPY.notFoundParam : FALLBACK_COPY[STATE_LINE[kind]];
  view.line = kind === "outdated" && e.message ? { kind: fallback.kind, title: fallback.title, text: e.message, inline: fallback.inline } : fallback;
  view.tapUrl = stateTap(kind, e);
  const art = { version: stateArtVersion(), base: ORIGIN + ART_PATH };
  view.art = await loadViewArt(view, art, null, null);
  return view;
}

/** A payload's view at the phone's clock: rows still visible, their phases and lines, the mood, art and covers. */
async function payloadView(ctx, payload, saved, outcome, savedReason) {
  const view = baseView(ctx);
  const now = view.now;
  view.payload = payload;
  view.copy = payload.copy;
  view.saved = saved;
  view.savedReason = saved ? savedReason || "offline" : null;
  view.outcome = outcome;
  view.links = payload.links;
  view.keepCovers = coverPaths(payload);
  const visible = pickRows(payload.rows, now, 8);
  view.kind = payload.state === "rows" && !visible.length ? "resting" : payload.state;
  view.hungry = isHungry(payload, now);
  const family = ctx.family;
  let shown = [];
  if (view.kind === "rows") {
    if (family === "small" || family === "accessoryRectangular" || family === "accessoryInline") {
      const ticker = tickerRow(payload.rows, now);
      shown = ticker ? [ticker] : [];
    } else {
      shown = visible.slice(0, SHOWN[family]);
    }
  }
  view.rows = shown.map((row) => {
    const phase = rowPhase(row.at, now);
    return { row, phase, lines: rowLines(row, phase, payload.copy) };
  });
  if (view.kind === "resting") view.line = payload.copy.resting;
  else if (view.kind !== "rows") view.line = payload.copy.state || payload.copy.resting;
  if (view.kind === "empty-list") view.tapUrl = payload.links.browse;
  else if (family === "medium" || family === "large" || family === "accessoryCircular") view.tapUrl = payload.links.schedule;
  else view.tapUrl = payload.links.week;
  // A stored copy may predate an art bump another list's payload already named (the server serves only the newest).
  const art = outcome === "ok" ? payload.art : { base: payload.art.base, version: stateArtVersion() };
  view.art = await loadViewArt(view, art, payload.owner.tier, payload.tuning);
  if (!view.glass && (family === "small" || family === "medium" || family === "large") && view.rows.length) {
    const max = Math.min(view.rows.length, payload.tuning.coverFetches);
    const loaded = await loadCovers(
      view.rows.map((r) => r.row),
      ctx.startedAt,
      max,
      ctx.inApp
    );
    view.covers = loaded.covers;
    view.fetched = loaded.fetched;
  }
  return view;
}

/** Which list a widget run shows, and where that came from (also for main's error state). */
function widgetTarget() {
  return resolveTarget(parseParameter(args.widgetParameter), readConfig());
}

/** The view for a widget run (or an in-app preview): parameter, saved copy, one request, the phone's clock. */
async function buildView(family, opts) {
  const ctx = {
    family,
    glass: false,
    startedAt: opts.startedAt,
    inApp: Boolean(opts.inApp),
    screen: screenSize(),
    scale: screenScale(),
    pad: isPad(),
  };
  const target = opts.inApp ? resolveTarget({ id: null, glass: false, unknown: [] }, readConfig()) : widgetTarget();
  ctx.glass = typeof opts.glass === "boolean" ? opts.glass : target.glass;
  if (target.kind !== "id") return stateView(ctx, target.kind, { outcome: target.kind, source: target.source, link: target.link });
  const id = target.id;
  const copy = readSaved(id);
  const age = copy ? Date.now() - copy.savedAt : Infinity;
  if (copy && age >= 0 && age < FRESH_MS) return payloadView(ctx, copy.payload, false, "fresh");
  const timeout = copy ? copy.payload.tuning.jsonTimeoutS : JSON_TIMEOUT_S;
  const r = await fetchPayload(id, opts.inApp ? APP_TIMEOUT_S : timeout);
  if (r.kind === "ok") {
    savePayload(id, r.payload);
    return payloadView(ctx, r.payload, false, "ok");
  }
  if (r.kind === "not-found") {
    removeSaved(id);
    return stateView(ctx, "not-found", { outcome: "not-found", source: target.source });
  }
  if (r.kind === "outdated") return stateView(ctx, "outdated", { outcome: "outdated", message: r.message, url: r.url });
  // An HTTP reply over HTTPS is normally kylevb.com's: only no answer, or a 2xx web page (never the route's: a
  // network filter's), means the schedule didn't come from kylevb.com.
  const reason = r.kind === "network" || isWebPage(r) ? "offline" : "unavailable";
  if (copy && Date.now() - copy.payload.generatedAt < SAVED_MAX_AGE_MS) return payloadView(ctx, copy.payload, true, "saved", reason);
  const kind = reason === "unavailable" ? "unavailable" : "unreachable";
  return stateView(ctx, kind, { outcome: reason, id, source: target.source });
}

async function runWidget(family, startedAt) {
  netRequests = 0;
  runDeadlineAt = startedAt + RUN_BUDGET_MS;
  const view = await buildView(family, { startedAt, inApp: false });
  const widget = render(view);
  // The boundaries come from the clock the rows were drawn at (art and covers may have taken seconds since);
  // the 5-minute floor from now. A hungrySince already reached is no boundary.
  const hungrySince = view.payload && !view.hungry ? view.payload.hungrySince : null;
  const next = nextRefreshMs(view.rows.map((r) => r.row), view.now, view.outcome, hungrySince);
  widget.refreshAfterDate = new Date(Math.max(next, Date.now() + REFRESH.minMs));
  return { widget, outcome: view.outcome, rows: view.rows.length, evict: view.fetched ? null : view.keepCovers };
}

// ─── In-app ───────────────────────────────────────────────────────────────────

async function say(title, message) {
  const a = new Alert();
  a.title = title;
  a.message = message || "";
  a.addCancelAction("OK");
  await a.presentAlert();
}

/**
 * Fetch a list in the app (no run budget) and cache its art and first covers; `artMissing` didn't download.
 * `onPayload` runs as soon as the payload is saved (Link saves the link then, so stopping the script during the
 * downloads keeps it). Art and covers download side by side: at most one image cap of silence.
 */
async function fetchInApp(id, onPayload) {
  const r = await fetchPayload(id, APP_TIMEOUT_S);
  if (r.kind !== "ok") return r;
  savePayload(id, r.payload);
  if (onPayload) onPayload(r.payload);
  const scale = screenScale();
  const largeCap = r.payload.tuning.largeSkyMaxScale;
  const [art] = await Promise.all([
    prefetchArt(r.payload.art, scale, largeCap),
    loadCovers(r.payload.rows.slice(0, MAX_COVERS), Date.now(), MAX_COVERS, true),
  ]);
  try {
    evictCovers(coverPaths(r.payload));
  } catch (e) {
    logError(e);
  }
  return { kind: "ok", payload: r.payload, art, artMissing: artNamesFor(scale, largeCap).length - art };
}

/** Said after a link or a refresh whose pictures didn't all arrive (widgets fetch what they draw early in a run). */
const ART_MISSING_NOTE = "Some pictures didn't finish downloading. Widgets fetch the ones they draw on later refreshes, or use Refresh now.";

/** A 2xx reply that isn't a payload or a web page (a server bug, an oversized body, a /v1 change this version rejects). */
const isUnreadable = (r) => r.kind === "server" && r.status >= 200 && r.status < 300 && !r.page;
/**
 * A 2xx web page instead of the route's JSON: a filter or security profile the phone trusts answered (a Wi-Fi
 * sign-in page can't: it fails the TLS handshake, "network").
 */
const isWebPage = (r) => r.kind === "server" && r.status >= 200 && r.status < 300 && Boolean(r.page);

/** What an in-app fetch that failed says (kylevb.com answered or not, and whether the link was saved). */
function failureLine(r, saved) {
  const tail = saved ? " The link is saved; widgets will try again." : "";
  if (r.kind === "network") return FALLBACK_COPY.unreachable.title + "." + tail;
  if (isWebPage(r)) return "The reply wasn't kylevb.com's schedule: a web page came back instead." + tail;
  if (isUnreadable(r)) return "kylevb.com sent a reply this version of the script can't read." + tail;
  return FALLBACK_COPY.unavailable.title + (r.status ? " (HTTP " + r.status + ")" : "") + "." + tail;
}

/**
 * The second line of a failed in-app fetch: nothing about the phone being offline (a slow reply times out too).
 * After a link (`saved`) the first line already says widgets will try again.
 */
function failureNext(r, saved) {
  if (r.kind === "network") return saved ? "Check this phone's connection." : "Check this phone's connection, or try again in a few minutes.";
  if (isWebPage(r)) return "A network filter or security profile can do this." + (saved ? "" : " Try again in a few minutes, or on another network.");
  if (isUnreadable(r)) return (saved ? "" : "Try again in a few minutes. ") + "If it keeps happening, paste the newest version from GitHub.";
  return saved ? "" : "Try again in a few minutes.";
}

const PARAM_NOTE =
  "A widget with a list link in its Parameter field shows that list: touch and hold the widget, then Edit Widget, to change or clear it.";

/** What a widget's Parameter field holds that doesn't work (a tap's `why`; an unknown one gets the neutral line). */
const PARAM_PROBLEM = {
  words: "That widget's Parameter field has words this widget doesn't use. It takes a list link, the word glass, or both.",
  link: "That widget's Parameter field has a link that isn't a list link: it may be cut off, or for another page. Use Copy link on the Airing Schedule.",
  missing: "That widget's Parameter field links to a list kylevb.com doesn't have.",
  other: "That widget's Parameter field needs a change.",
};
/** After linking from a widget whose Parameter has no list in it: that widget keeps its warning. */
const PARAM_KEEPS_WARNING = "That widget keeps its warning until its Parameter is fixed: touch and hold it, then Edit Widget.";

/**
 * Link my list. From a widget whose Parameter is wrong (`why`: "words", "link" or "missing"), it says what's wrong
 * and that only Edit Widget fixes it.
 */
async function linkFlow(why) {
  const fromParam = Boolean(why);
  const current = readConfig();
  let param = null;
  let message = fromParam
    ? (PARAM_PROBLEM[why] || PARAM_PROBLEM.other) + " " + PARAM_NOTE + " You can also link your list for widgets with an empty Parameter:"
    : "Paste the link from Copy link on your Airing Schedule.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const a = new Alert();
    a.title = attempt ? "That isn't a list link" : "Link your list";
    a.message = message;
    a.addTextField("https://kylevb.com/user/…", current.id ? ORIGIN + "/user/" + current.id : "");
    a.addAction("Link");
    a.addCancelAction("Cancel");
    if ((await a.presentAlert()) === -1) return;
    param = parseParameter(a.textFieldValue(0));
    if (param.id) break;
    message = "Use Copy link on your Airing Schedule at kylevb.com, then paste it here.";
  }
  if (!param || !param.id) return;
  const linked = param.id;
  const r = await fetchInApp(linked, (payload) => writeConfig({ id: linked, name: payload.owner.name }));
  // A Parameter with a list in it still shows that list; one with none keeps its warning.
  const note = !fromParam ? "" : why === "missing" ? PARAM_NOTE : PARAM_KEEPS_WARNING;
  if (r.kind === "ok") {
    await say(r.payload.copy.tags.Notice + " Linked to " + r.payload.copy.title + ".", [note, r.artMissing ? ART_MISSING_NOTE : ""].filter(Boolean).join(" "));
  } else if (r.kind === "not-found") {
    await say(FALLBACK_COPY.notFound.title, FALLBACK_COPY.notFound.text);
  } else if (r.kind === "outdated") {
    writeConfig({ id: param.id });
    await say(FALLBACK_COPY.outdated.title, r.message || FALLBACK_COPY.outdated.text);
  } else {
    writeConfig({ id: param.id });
    await say(failureLine(r, true), [failureNext(r, true), note].filter(Boolean).join(" "));
  }
}

async function refreshFlow() {
  const query = args.queryParameters || {};
  const queried = isStr(query.id) && CANONICAL_ID.test(query.id);
  const id = queried ? query.id : readConfig().id;
  // A widget whose Parameter names the list: a missing list is fixed in Edit Widget, not by pasting a link.
  const fromParam = queried && query.from === "param";
  if (!id) {
    await linkFlow(null);
    return;
  }
  const r = await fetchInApp(id);
  if (r.kind === "ok") await say(r.payload.copy.tags.Notice + " Fetched. " + r.payload.copy.savedNote + ".", r.artMissing ? ART_MISSING_NOTE : "");
  else if (r.kind === "not-found") await say(FALLBACK_COPY.notFound.title, fromParam ? PARAM_PROBLEM.missing + " " + PARAM_NOTE : FALLBACK_COPY.notFound.text);
  else if (r.kind === "outdated") await say(FALLBACK_COPY.outdated.title, r.message || FALLBACK_COPY.outdated.text);
  else await say(failureLine(r, false), failureNext(r, false));
}

const PREVIEW_FAMILIES = [
  ["Small", "small", "presentSmall"],
  ["Medium", "medium", "presentMedium"],
  ["Large", "large", "presentLarge"],
  ["Lock Screen: Rectangular (estimated)", "accessoryRectangular", "presentAccessoryRectangular"],
  ["Lock Screen: Inline (estimated)", "accessoryInline", "presentAccessoryInline"],
  ["Lock Screen: Circular (estimated)", "accessoryCircular", "presentAccessoryCircular"],
];

async function previewFlow() {
  const pick = new Alert();
  pick.title = "Preview";
  for (const [label] of PREVIEW_FAMILIES) pick.addAction(label);
  pick.addCancelAction("Back");
  const index = await pick.presentSheet();
  if (index === -1) return;
  const [, family, method] = PREVIEW_FAMILIES[index];
  let glass = false;
  if (!isAccessory(family)) {
    const mode = new Alert();
    mode.title = "Preview";
    mode.addAction("Night sky");
    mode.addAction("Glass");
    mode.addCancelAction("Back");
    const choice = await mode.presentSheet();
    if (choice === -1) return;
    glass = choice === 1;
  }
  const view = await buildView(family, { startedAt: Date.now(), inApp: true, glass });
  await render(view)[method]();
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function diagnosticsText() {
  const c = readConfig();
  const p = paths();
  const f = files();
  const copy = c.id ? readSaved(c.id) : null;
  // The saved copy's owner belongs to this id; config's name is only what the last successful link saw.
  const owner = copy ? copy.payload.owner.name : c.name;
  const scale = screenScale();
  const version = stateArtVersion();
  const names = artNamesFor(scale, copy ? copy.payload.tuning.largeSkyMaxScale : 3);
  const cached = names.filter((name) => f.fileExists(f.joinPath(p.art, artFile(name, version)))).length;
  const latest = copy ? copy.payload.script.latest : SCRIPT_VERSION;
  const lines = [
    "Script v" + SCRIPT_VERSION + " (latest v" + latest + ")",
    c.id ? "List " + c.id + (owner ? " (" + owner + ")" : "") : "No list linked yet",
    copy ? copy.payload.copy.savedNote : "Nothing saved yet",
    "Art v" + version + " @" + scale + "x: " + cached + "/" + names.length,
    "Covers cached: " + f.listContents(p.covers).length,
  ];
  const runs = readJSON(p.runs);
  const list = Array.isArray(runs) ? runs : [];
  const lastError = [...list].reverse().find((r) => isObj(r) && isStr(r.err));
  if (lastError) {
    const minutes = Math.max(0, Math.round((Date.now() - lastError.t) / 60000));
    lines.push("Last error, " + minutes + " min ago (" + lastError.fam + "): " + lastError.err);
  }
  const since = Date.now() - 86400000;
  for (const family of FAMILIES) {
    const recent = list.filter((r) => isObj(r) && r.fam === family && isNum(r.t) && r.t >= since);
    if (!recent.length) continue;
    const gaps = [];
    for (let i = 1; i < recent.length; i++) gaps.push((recent[i].t - recent[i - 1].t) / 60000);
    const outcomes = {};
    for (const r of recent) outcomes[r.out] = (outcomes[r.out] || 0) + 1;
    const slowest = Math.max(...recent.map((r) => (isNum(r.ms) ? r.ms : 0)));
    lines.push(
      family +
        ": " +
        recent.length +
        " runs, median gap " +
        Math.round(median(gaps)) +
        " min, longest " +
        Math.round(gaps.length ? Math.max(...gaps) : 0) +
        " min, " +
        Object.keys(outcomes)
          .map((k) => k + " " + outcomes[k])
          .join(", ") +
        ", slowest " +
        slowest +
        " ms"
    );
  }
  return lines.join("\n");
}

async function appMenu() {
  for (let step = 0; step < 50; step++) {
    const c = readConfig();
    const copy = c.id ? readSaved(c.id) : null;
    const runs = readJSON(paths().runs);
    const last = Array.isArray(runs) && runs.length ? runs[runs.length - 1] : null;
    const message = [
      c.id ? (copy ? copy.payload.copy.title : "Linked list") + " · …" + c.id.slice(-4) : "No list linked yet",
      last ? "Last widget run: " + last.fam + ", " + last.out + ", " + (last.ms / 1000).toFixed(1) + " s" : "No widget run yet",
    ];
    if (copy && copy.payload.script.latest > SCRIPT_VERSION) {
      message.push("A newer version (v" + copy.payload.script.latest + ") is on GitHub. Paste it over this script.");
    }
    const menu = new Alert();
    menu.title = "kylevb Anime widget v" + SCRIPT_VERSION;
    menu.message = message.join("\n");
    const actions = [
      "Link my list…",
      "Preview…",
      "Glass mode for every widget: " + (c.glass ? "On" : "Off"),
      "Diagnostics",
      "Refresh now",
      "Clear saved data",
    ];
    for (const action of actions) menu.addAction(action);
    menu.addCancelAction("Done");
    const index = await menu.presentSheet();
    if (index === -1) return;
    if (index === 0) await linkFlow(null);
    else if (index === 1) await previewFlow();
    else if (index === 2) writeConfig({ glass: !c.glass });
    else if (index === 3) await say("Diagnostics", diagnosticsText());
    else if (index === 4) await refreshFlow();
    else if (index === 5) clearSaved();
  }
}

async function runApp() {
  if (config.runsWithSiri) return;
  const query = args.queryParameters || {};
  const kv = query.kv;
  if (kv === "setup") await linkFlow(query.from === "param" ? (["words", "link", "missing"].includes(query.why) ? query.why : "other") : null);
  else if (kv === "refresh") await refreshFlow();
  else await appMenu();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const errorText = (err) => clipLog(err && err.message ? err.message : err, 300);

async function main() {
  const startedAt = Date.now();
  const family = familyFromConfig();
  let widget = null;
  let outcome = "error";
  let rows = 0;
  let evict = null;
  let err = null;
  try {
    if (config.runsInWidget) ({ widget, outcome, rows, evict } = await runWidget(family, startedAt));
    else await runApp();
  } catch (e) {
    err = errorText(e);
    logError(e);
    if (config.runsInWidget) {
      outcome = "error";
      // The tap reaches this widget's own list (or its Parameter's problem); widgetTarget() itself may throw.
      const tap = { outcome: "error", id: null, source: null, link: false };
      try {
        const target = widgetTarget();
        Object.assign(tap, { id: target.kind === "id" ? target.id : null, source: target.source, link: Boolean(target.link) });
        const ctx = { family, glass: false, startedAt, inApp: false, screen: screenSize(), scale: screenScale(), pad: isPad() };
        const view = await stateView(ctx, "error", tap);
        widget = render(view);
        widget.refreshAfterDate = new Date(nextRefreshMs([], Date.now(), "error", null));
      } catch (again) {
        logError(again);
        widget = bareErrorWidget(family, tap);
      }
    }
  }
  try {
    if (widget) Script.setWidget(widget);
    if (config.runsInWidget) {
      const entry = { t: startedAt, fam: family, out: outcome, ms: Date.now() - startedAt, rows, net: netRequests };
      if (err) entry.err = err;
      appendRunLog(entry);
    }
    // After setWidget: the widget handed to iOS never loses a file it draws.
    if (evict) evictCovers(evict);
  } catch (e) {
    logError(errorText(e));
  }
  Script.complete();
}

if (typeof module !== "undefined" && module) {
  module.exports = {
    parseParameter,
    resolveTarget,
    rowPhase,
    pickRows,
    tickerRow,
    rowLines,
    nextRefreshMs,
    isHungry,
    moodFor,
    metrics,
    sizeRow,
    newestArtVersion,
    raceDeadline,
    TIMED_OUT,
    isPayload,
    sanitizePayload,
    artName,
    artFile,
    artNamesFor,
    fnv1a,
    SIZES,
    IPAD_SIZES,
    T,
    FALLBACK_COPY,
    BASE_COPY,
    SCRIPT_VERSION,
    ART_VERSION_FALLBACK,
    RUN_BUDGET_MS,
    SCHEMA,
    ORIGIN,
    API_PATH,
    ART_PATH,
    GRACE_S,
    SOON_S,
    TIMER_S,
    CANONICAL_ID,
    SHOWN,
    REFRESH,
    FRESH_MS,
    SAVED_MAX_AGE_MS,
  };
}

await main();
