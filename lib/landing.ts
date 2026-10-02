/**
 * Pure helpers, constants and shared types for the landing page ("/").
 *
 * Imported by the server loader (server/lib/landing.ts) and by the landing's
 * client islands, so: no React, no IO, no `Date.now()` (callers pass the time).
 */
import { SCHEDULE_DAYS } from "@/components/mylist/schedule";
import {
  DISPLAY_TIME_ZONE,
  airingWeekday,
  compareByNextAiring,
  nextAiring,
  splitDuration,
  type Weekday,
} from "./anime/airing";
import { normalizeMedia } from "./anime/normalize";
import { displayTitle, isListStatus, type AnimeMedia, type ListStatus } from "./anime/types";
import { SEASON_LABELS, isSeasonName, seasonPath, type SeasonName } from "./season";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The Tensura franchise shown in the Tempest Archive, oldest first (checked 2026-09-29). */
export const TEMPEST_IDS: readonly number[] = [
  101280, 108511, 116742, 139498, 156822, 182206, 182205, 217330, 217331,
];

export const RIMURU_CHARACTER_ID = 123962;
export const RIMURU_CHARACTER_URL = "https://anilist.co/character/123962";

/** The tracker demo's show: Tensura Season 4 (24 episodes). */
export const DEMO_MEDIA_ID = 182205;

/** A show stays "airing next" for this long after its episode's air time. */
export const AIRED_GRACE_SECONDS = 1800;

/** Quest 1: add this many shows. */
export const QUEST_TARGET = 3;

/** List sizes at which the viewer's slime evolves. */
export const TIER_THRESHOLDS = { demon: 3, lord: 10 } as const;

/** sessionStorage key of a signed-out "+ Add" waiting for the OAuth round trip. */
export const ADD_INTENT_KEY = "kv:add-intent";
/** An add intent older than this is ignored. */
export const ADD_INTENT_TTL_MS = 15 * 60 * 1000;

/** Short shelf titles; an unknown id falls back to displayTitle. */
export const TEMPEST_SHORT_LABELS: Record<number, string> = {
  101280: "Season 1",
  108511: "Season 2",
  116742: "Season 2 Part 2",
  139498: "Movie: Scarlet Bond",
  156822: "Season 3",
  182206: "Movie: Tears of the Azure Sea",
  182205: "Season 4",
  217330: "Clayman REVENGE",
  217331: "Season 4 Part 3",
};

/** Banner preference for the Tempest band (S1 first). */
const TEMPEST_BANNER_PREFERENCE = [101280, 156822, 182205];

/** Only AniList's image CDN is hotlinked (covers are checked by normalizeMedia). */
const ANILIST_CDN_PREFIX = "https://s4.anilist.co/";

export type EvolutionTier = "slime" | "named" | "demon" | "lord";

export const TIER_LABELS: Record<EvolutionTier, string> = {
  slime: "Slime",
  named: "Named Slime",
  demon: "Demon Slime",
  lord: "Demon Lord",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandingSeasonMeta {
  year: number;
  season: SeasonName;
  /** "Fall 2026" */
  label: string;
  /** The season starts within 14 days and hasn't yet (lib/season.ts#landingSeason). */
  preview: boolean;
  /** "October 1" */
  startsLabel: string;
  /** "/anime/2026/fall" */
  seasonHref: string;
  /** The season path in preview mode, else "/anime" (resolved per request). */
  browseHref: string;
  /** "Preview Fall 2026" or "Browse this season". */
  browseLabel: string;
  /** "74", "150+", "50+"… (never AniList's pageInfo.total); null hides the stat. */
  showCount: string | null;
  /** Shows continuing from earlier seasons; null when unknown. */
  continuingCount: number | null;
}

export interface TempestEntry {
  id: number;
  /** "Season 2 Part 2" */
  shortLabel: string;
  fullTitle: string;
  /** Used for the "Find it" search link. */
  romaji: string;
  /** "Fall 2018" */
  seasonLabel: string | null;
  /** "TV" | "Movie" | … */
  formatLabel: string | null;
  episodes: number | null;
  /** AniList status: FINISHED, RELEASING, NOT_YET_RELEASED… */
  status: string | null;
  upcoming: boolean;
  /** coverImage.large (the ~230px file). */
  coverUrl: string | null;
  /** coverImage.extraLarge (the ~460px file) for sharp 2× screens, when AniList has one. */
  coverUrlXL: string | null;
  color: string | null;
  /** Start date as YYYYMMDD (unknown month/day sort last); null when the year is unknown. */
  startKey: number | null;
}

export interface LandingTempest {
  /** False when rendering TEMPEST_FALLBACK (no add buttons, no banner or portrait). */
  live: boolean;
  entries: TempestEntry[];
  bannerUrl: string | null;
  portraitUrl: string | null;
  characterUrl: string;
}

export interface LandingExtras {
  tempest: {
    media: AnimeMedia[];
    bannerUrl: string | null;
    portraitUrl: string | null;
    characterUrl: string;
  } | null;
  seasonCount: { count: number; capped: boolean } | null;
}

export interface LandingData {
  generatedAt: number;
  season: LandingSeasonMeta | null;
  /** Up to 12 shows airing soon, soonest first. */
  airingIds: number[];
  /** The subset of airingIds continuing from an earlier season. */
  continuingIds: number[];
  tempest: LandingTempest;
  /** Every addable show on the page (airing candidates + live Tempest media). */
  mediaById: Record<number, AnimeMedia>;
}

/** What reaches the client provider (server components get ids and meta as props). */
export interface LandingClientData {
  generatedAt: number;
  season: LandingSeasonMeta | null;
  mediaById: Record<number, AnimeMedia>;
  continuingIds: number[];
}

export interface AddIntent {
  id: number;
  status?: ListStatus;
  /** Epoch ms when the visitor clicked. */
  at: number;
  /** The snapshot to add (re-normalized on read, and again by the server). */
  media: AnimeMedia;
}

// ---------------------------------------------------------------------------
// Static fallbacks (checked live on 2026-09-29)
// ---------------------------------------------------------------------------

const cover = (file: string) =>
  `https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/${file}`;
/** The same file at AniList's ~460px size (checked to exist for every fallback cover). */
const coverXL = (file: string) =>
  `https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/${file}`;

/** The Tempest shelf when the extras request failed: no banner, portrait or add buttons. */
export const TEMPEST_FALLBACK: TempestEntry[] = [
  {
    id: 101280,
    shortLabel: "Season 1",
    fullTitle: "That Time I Got Reincarnated as a Slime",
    romaji: "Tensei Shitara Slime Datta Ken",
    seasonLabel: "Fall 2018",
    formatLabel: "TV",
    episodes: 24,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx101280-tDxCVJm714nt.jpg"),
    coverUrlXL: coverXL("bx101280-tDxCVJm714nt.jpg"),
    color: "#5daef1",
    startKey: 20181002,
  },
  {
    id: 108511,
    shortLabel: "Season 2",
    fullTitle: "That Time I Got Reincarnated as a Slime Season 2",
    romaji: "Tensei Shitara Slime Datta Ken 2nd Season",
    seasonLabel: "Winter 2021",
    formatLabel: "TV",
    episodes: 12,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx108511-PufFordLNyIb.jpg"),
    coverUrlXL: coverXL("bx108511-PufFordLNyIb.jpg"),
    color: "#f16b50",
    startKey: 20210112,
  },
  {
    id: 116742,
    shortLabel: "Season 2 Part 2",
    fullTitle: "That Time I Got Reincarnated as a Slime Season 2 Part 2",
    romaji: "Tensei Shitara Slime Datta Ken 2nd Season Part 2",
    seasonLabel: "Summer 2021",
    formatLabel: "TV",
    episodes: 12,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx116742-jn0dW23ftehq.jpg"),
    coverUrlXL: coverXL("bx116742-jn0dW23ftehq.jpg"),
    color: "#e4a15d",
    startKey: 20210706,
  },
  {
    id: 139498,
    shortLabel: "Movie: Scarlet Bond",
    fullTitle: "That Time I Got Reincarnated as a Slime the Movie: Scarlet Bond",
    romaji: "Tensei Shitara Slime Datta Ken: Guren no Kizuna-hen",
    seasonLabel: "Fall 2022",
    formatLabel: "Movie",
    episodes: 1,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx139498-DdVASeAj7ag4.jpg"),
    coverUrlXL: coverXL("bx139498-DdVASeAj7ag4.jpg"),
    color: "#4393f1",
    startKey: 20221125,
  },
  {
    id: 156822,
    shortLabel: "Season 3",
    fullTitle: "That Time I Got Reincarnated as a Slime Season 3",
    romaji: "Tensei Shitara Slime Datta Ken 3rd Season",
    seasonLabel: "Spring 2024",
    formatLabel: "TV",
    episodes: 24,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx156822-Jzo2ITWgm4kM.jpg"),
    coverUrlXL: coverXL("bx156822-Jzo2ITWgm4kM.jpg"),
    color: "#e4785d",
    startKey: 20240405,
  },
  {
    id: 182206,
    shortLabel: "Movie: Tears of the Azure Sea",
    fullTitle: "That Time I Got Reincarnated as a Slime the Movie: Tears of the Azure Sea",
    romaji: "Tensei Shitara Slime Datta Ken: Soukai no Namida-hen",
    seasonLabel: "Winter 2026",
    formatLabel: "Movie",
    episodes: 1,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx182206-LcitQfDLsdnC.png"),
    coverUrlXL: coverXL("bx182206-LcitQfDLsdnC.png"),
    color: "#35a1e4",
    startKey: 20260227,
  },
  {
    id: 182205,
    shortLabel: "Season 4",
    fullTitle: "That Time I Got Reincarnated as a Slime Season 4",
    romaji: "Tensei Shitara Slime Datta Ken 4th Season Part 1 & 2",
    seasonLabel: "Spring 2026",
    formatLabel: "TV",
    episodes: 24,
    status: "FINISHED",
    upcoming: false,
    coverUrl: cover("bx182205-q2AeO1owuQbO.jpg"),
    coverUrlXL: coverXL("bx182205-q2AeO1owuQbO.jpg"),
    color: "#1abbd6",
    startKey: 20260403,
  },
  {
    id: 217330,
    shortLabel: "Clayman REVENGE",
    fullTitle: "Tensei Shitara Slime Datta Ken: Clayman REVENGE",
    romaji: "Tensei Shitara Slime Datta Ken: Clayman REVENGE",
    seasonLabel: "Spring 2027",
    formatLabel: "TV",
    episodes: null,
    status: "NOT_YET_RELEASED",
    upcoming: true,
    coverUrl: cover("bx217330-sk1dvlFIsM2O.png"),
    coverUrlXL: coverXL("bx217330-sk1dvlFIsM2O.png"),
    color: null,
    startKey: 20270432,
  },
  {
    id: 217331,
    shortLabel: "Season 4 Part 3",
    fullTitle: "Tensei Shitara Slime Datta Ken 4th Season Part 3",
    romaji: "Tensei Shitara Slime Datta Ken 4th Season Part 3",
    seasonLabel: "Summer 2027",
    formatLabel: "TV",
    episodes: null,
    status: "NOT_YET_RELEASED",
    upcoming: true,
    coverUrl: cover("bx217331-iennFNPU2f7K.png"),
    coverUrlXL: coverXL("bx217331-iennFNPU2f7K.png"),
    color: "#e4ae35",
    startKey: 20270732,
  },
];

/** The tracker demo's show when the extras (and so its full snapshot) are unavailable. */
export const DEMO_FALLBACK = {
  id: DEMO_MEDIA_ID,
  title: "That Time I Got Reincarnated as a Slime Season 4",
  episodes: 24,
  coverUrl: cover("bx182205-q2AeO1owuQbO.jpg"),
  color: "#1abbd6",
} as const;

// ---------------------------------------------------------------------------
// Season meta and counts
// ---------------------------------------------------------------------------

const startsLabelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

/** The landing's season meta from lib/season.ts#landingSeason plus the counts. */
export function buildSeasonMeta(
  target: { year: number; season: SeasonName; preview: boolean; startsAtMs: number },
  counts: { showCount: string | null; continuingCount: number | null }
): LandingSeasonMeta {
  const label = `${SEASON_LABELS[target.season]} ${target.year}`;
  const seasonHref = seasonPath(target.year, target.season);
  return {
    year: target.year,
    season: target.season,
    label,
    preview: target.preview,
    startsLabel: startsLabelFormat.format(target.startsAtMs),
    seasonHref,
    browseHref: target.preview ? seasonHref : "/anime",
    browseLabel: target.preview ? `Preview ${label}` : "Browse this season",
    showCount: counts.showCount,
    continuingCount: counts.continuingCount,
  };
}

/**
 * The season's show count as displayed: exact from the id pages ("74", or
 * "150+" at the 3-page cap), else from page 1 ("50+" when there are more).
 */
export function seasonShowCount({
  exact,
  pageOneCount,
  hasNextPage,
}: {
  exact: { count: number; capped: boolean } | null;
  pageOneCount: number;
  hasNextPage: boolean;
}): string {
  if (exact) return exact.capped ? `${exact.count}+` : String(exact.count);
  return hasNextPage ? `${pageOneCount}+` : String(pageOneCount);
}

// ---------------------------------------------------------------------------
// Airing candidates
// ---------------------------------------------------------------------------

/**
 * The shows the landing counts down to: season page 1 plus the continuing
 * series (deduped, season media wins), whose next episode airs within
 * [now − 30 min, now + windowDays]; the `pool` most popular of those, then
 * soonest first, `limit` of them.
 */
export function pickAiringCandidates(
  media: readonly AnimeMedia[],
  carryOver: readonly AnimeMedia[],
  nowMs: number,
  { windowDays, pool = 30, limit = 12 }: { windowDays: number; pool?: number; limit?: number }
): { ids: number[]; continuingIds: number[] } {
  const nowSeconds = nowMs / 1000;
  const from = nowSeconds - AIRED_GRACE_SECONDS;
  const to = nowSeconds + windowDays * 86_400;

  const seen = new Set<number>();
  const continuing = new Set<number>();
  const merged: AnimeMedia[] = [];
  for (const item of media) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  for (const item of carryOver) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    continuing.add(item.id);
    merged.push(item);
  }

  const inWindow = merged.filter((item) => {
    const next = nextAiring(item);
    return next !== null && next.airingAt >= from && next.airingAt <= to;
  });
  // Array#sort is stable: equal popularity keeps season-first order, and equal
  // air times keep popularity order.
  const popular = [...inWindow]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, pool);
  const ids = popular
    .sort(compareByNextAiring)
    .slice(0, limit)
    .map((item) => item.id);
  return { ids, continuingIds: ids.filter((id) => continuing.has(id)) };
}

/**
 * The first `count` shows (in the given order) whose next episode hasn't
 * aired more than 30 min before `nowMs`. Later candidates backfill, so a
 * stale render still shows a full row.
 */
export function visibleAiring(
  media: readonly AnimeMedia[],
  nowMs: number,
  count: number,
  exclude?: (id: number) => boolean
): AnimeMedia[] {
  const cutoff = nowMs / 1000 - AIRED_GRACE_SECONDS;
  const visible: AnimeMedia[] = [];
  for (const item of media) {
    if (visible.length >= count) break;
    if (exclude?.(item.id)) continue;
    const next = nextAiring(item);
    if (!next || next.airingAt < cutoff) continue;
    visible.push(item);
  }
  return visible;
}

// ---------------------------------------------------------------------------
// Extras (Tempest Archive + exact season count)
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cdnUrl = (value: unknown): string | null =>
  typeof value === "string" && value.length <= 2000 && value.startsWith(ANILIST_CDN_PREFIX)
    ? value
    : null;

const TEMPEST_ID_SET: ReadonlySet<number> = new Set(TEMPEST_IDS);

function parseTempest(data: Obj): LandingExtras["tempest"] {
  const page = data.tempest;
  if (!isObj(page) || !Array.isArray(page.media)) return null;

  const media: AnimeMedia[] = [];
  const banners = new Map<number, string>();
  for (const raw of page.media) {
    const item = normalizeMedia(raw);
    if (!item || !TEMPEST_ID_SET.has(item.id) || media.some((m) => m.id === item.id)) continue;
    media.push(item);
    // bannerImage isn't part of AnimeMedia: read it before it's normalized away.
    const banner = isObj(raw) ? cdnUrl(raw.bannerImage) : null;
    if (banner) banners.set(item.id, banner);
  }
  if (!media.length) return null;

  const mascot = isObj(data.mascot) && Array.isArray(data.mascot.characters)
    ? data.mascot.characters[0]
    : null;
  const character = isObj(mascot) && mascot.id === RIMURU_CHARACTER_ID ? mascot : null;
  const portraitUrl = character && isObj(character.image) ? cdnUrl(character.image.large) : null;
  const siteUrl = character?.siteUrl;
  const characterUrl =
    typeof siteUrl === "string" && siteUrl.startsWith("https://anilist.co/character/")
      ? siteUrl
      : RIMURU_CHARACTER_URL;

  return {
    media,
    bannerUrl:
      TEMPEST_BANNER_PREFERENCE.map((id) => banners.get(id)).find((url) => url !== undefined) ??
      null,
    portraitUrl,
    characterUrl,
  };
}

function parseSeasonCount(data: Obj): LandingExtras["seasonCount"] {
  const pages = [data.count1, data.count2, data.count3];
  const ids = new Set<number>();
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    if (!isObj(page) || !Array.isArray(page.media)) return null;
    for (const item of page.media) {
      const id = isObj(item) ? item.id : null;
      if (typeof id === "number" && Number.isInteger(id) && id > 0) ids.add(id);
    }
    const hasNextPage = isObj(page.pageInfo) && page.pageInfo.hasNextPage === true;
    if (!hasNextPage) return { count: ids.size, capped: false };
  }
  return { count: ids.size, capped: true };
}

/**
 * Parses the LandingExtras GraphQL response. Each part is validated on its
 * own (a 200 with GraphQL errors can carry partial nulls, and it is cached
 * for an hour); a missing or malformed part becomes null. Null when there
 * is no `data` object at all.
 */
export function parseLandingExtras(json: unknown): LandingExtras | null {
  if (!isObj(json) || !isObj(json.data)) return null;
  const data = json.data;
  return { tempest: parseTempest(data), seasonCount: parseSeasonCount(data) };
}

// ---------------------------------------------------------------------------
// Tempest shelf
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
};

/** "TV", "Movie", "OVA", "Special", "ONA", "TV Short"; null for anything else. */
export const formatLabel = (format: string | null | undefined): string | null =>
  (format && FORMAT_LABELS[format]) || null;

/** "Fall 2018" (the year alone when the season is unknown); null without a year. */
export function seasonLabel(
  season: string | null | undefined,
  year: number | null | undefined
): string | null {
  if (!year) return null;
  const name = season?.toLowerCase();
  return isSeasonName(name) ? `${SEASON_LABELS[name]} ${year}` : String(year);
}

function startKey(media: AnimeMedia): number | null {
  const { year, month, day } = media.startDate;
  if (!year) return null;
  // Unknown parts sort after the known ones of the same year / month.
  return year * 10_000 + (month ?? 13) * 100 + (day ?? 32);
}

export function toTempestEntry(media: AnimeMedia): TempestEntry {
  const fullTitle = displayTitle(media);
  return {
    id: media.id,
    shortLabel: TEMPEST_SHORT_LABELS[media.id] ?? fullTitle,
    fullTitle,
    romaji: media.title.romaji || fullTitle,
    seasonLabel: seasonLabel(media.season, media.seasonYear ?? media.startDate.year),
    formatLabel: formatLabel(media.format),
    episodes: media.episodes,
    status: media.status,
    upcoming: media.status === "NOT_YET_RELEASED",
    coverUrl: media.coverImage.large ?? media.coverImage.medium,
    coverUrlXL: media.coverImage.extraLarge ?? null,
    color: media.coverImage.color,
    startKey: startKey(media),
  };
}

/** Oldest first; entries without a known start date last (stable). */
export const sortTempest = (entries: readonly TempestEntry[]): TempestEntry[] =>
  [...entries].sort(
    (a, b) => (a.startKey ?? Number.POSITIVE_INFINITY) - (b.startKey ?? Number.POSITIVE_INFINITY)
  );

/** The Tempest band's data: live from the extras, else the static fallback. */
export function tempestFromExtras(extras: LandingExtras | null): LandingTempest {
  const tempest = extras?.tempest;
  if (!tempest || !tempest.media.length) {
    return {
      live: false,
      entries: TEMPEST_FALLBACK,
      bannerUrl: null,
      portraitUrl: null,
      characterUrl: RIMURU_CHARACTER_URL,
    };
  }
  return {
    live: true,
    entries: sortTempest(tempest.media.map(toTempestEntry)),
    bannerUrl: tempest.bannerUrl,
    portraitUrl: tempest.portraitUrl,
    characterUrl: tempest.characterUrl,
  };
}

// ---------------------------------------------------------------------------
// Session: evolution tiers and names
// ---------------------------------------------------------------------------

/** Naming = signing in; the list size does the rest. Unknown count (loading) → named. */
export function evolutionTier(signedIn: boolean, count: number | null): EvolutionTier {
  if (!signedIn) return "slime";
  if (count === null || count < TIER_THRESHOLDS.demon) return "named";
  if (count < TIER_THRESHOLDS.lord) return "demon";
  return "lord";
}

/** The next tier and the list size it needs (0 = just sign in); null at the top. */
export function nextTier(tier: EvolutionTier): { tier: EvolutionTier; at: number } | null {
  switch (tier) {
    case "slime":
      return { tier: "named", at: 0 };
    case "named":
      return { tier: "demon", at: TIER_THRESHOLDS.demon };
    case "demon":
      return { tier: "lord", at: TIER_THRESHOLDS.lord };
    default:
      return null;
  }
}

/** First whitespace-separated token of a display name, at most 24 characters. */
export function firstName(name: string | null | undefined): string | null {
  const first = typeof name === "string" ? name.trim().split(/\s+/)[0] : "";
  return first ? Array.from(first).slice(0, 24).join("") : null;
}

/** "1 show" / "12 shows" */
export const showsLabel = (count: number) => `${count} ${count === 1 ? "show" : "shows"}`;

// ---------------------------------------------------------------------------
// Time labels (Pacific Time, plain spaces so SSR and browsers match)
// ---------------------------------------------------------------------------

const plainSpaces = (text: string) => text.replace(/[  ]/g, " ");

const weekdayTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "Wed 9:30 AM" (Pacific Time) for a unix timestamp in seconds. */
export const formatWeekdayTime = (unixSeconds: number) =>
  plainSpaces(weekdayTimeFormat.format(new Date(unixSeconds * 1000)));

/** "1d 4h 12m" / "4h 12m" (the per-minute countdown). */
export function formatCountdownMinutes(totalSeconds: number) {
  const { d, h, m } = splitDuration(totalSeconds);
  return `${d ? `${d}d ` : ""}${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Schedule preview
// ---------------------------------------------------------------------------

/** Shows with a next episode, by the weekday it airs (Pacific Time), soonest first. */
export function groupByWeekday(media: readonly AnimeMedia[]): Record<Weekday, AnimeMedia[]> {
  const groups = Object.fromEntries(SCHEDULE_DAYS.map((day) => [day, [] as AnimeMedia[]])) as Record<
    Weekday,
    AnimeMedia[]
  >;
  for (const item of media) {
    if (!nextAiring(item)) continue;
    const day = airingWeekday(item);
    if (day) groups[day].push(item);
  }
  for (const day of SCHEDULE_DAYS) groups[day].sort(compareByNextAiring);
  return groups;
}

/** Today when it has shows, else the next day (wrapping to Monday) that does, else today. */
export function defaultScheduleDay(
  groups: Partial<Record<Weekday, readonly AnimeMedia[]>>,
  today: Weekday
): Weekday {
  const start = SCHEDULE_DAYS.indexOf(today);
  if (start === -1) return today;
  for (let offset = 0; offset < SCHEDULE_DAYS.length; offset++) {
    const day = SCHEDULE_DAYS[(start + offset) % SCHEDULE_DAYS.length];
    if (groups[day]?.length) return day;
  }
  return today;
}

// ---------------------------------------------------------------------------
// Sign-in intent ("+ Add" while signed out → finish the add after OAuth)
// ---------------------------------------------------------------------------

/** Where the intent dialog's Google sign-in returns: "/?add=123&as=planning#quests". */
export const addIntentCallbackUrl = (id: number, status?: ListStatus) =>
  `/?add=${id}${status ? `&as=${status}` : ""}#quests`;

export const serializeAddIntent = (intent: AddIntent): string =>
  JSON.stringify({ id: intent.id, status: intent.status, at: intent.at, media: intent.media });

/**
 * A stored intent for `expectedId`, if it is well-formed, under 15 minutes
 * old and its status is a real list status. The media snapshot is
 * re-normalized (sessionStorage is client-controlled).
 */
export function parseAddIntent(
  raw: string | null | undefined,
  expectedId: number,
  nowMs: number
): AddIntent | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed) || parsed.id !== expectedId) return null;

  const at = parsed.at;
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  const age = nowMs - at;
  // A little tolerance for clock adjustments, none for intents from the future.
  if (age < -60_000 || age > ADD_INTENT_TTL_MS) return null;

  let status: ListStatus | undefined;
  if (parsed.status !== undefined && parsed.status !== null) {
    if (!isListStatus(parsed.status)) return null;
    status = parsed.status;
  }

  const media = normalizeMedia(parsed.media);
  if (!media || media.id !== expectedId) return null;
  return status ? { id: expectedId, status, at, media } : { id: expectedId, at, media };
}
