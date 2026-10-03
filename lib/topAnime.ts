/**
 * /topanime's data: MyAnimeList's "Top Anime" ranking from its official API
 * v2 (https://myanimelist.net/apiconfig/references/api/v2, `GET
 * /anime/ranking?ranking_type=all`). Pure and shared: the server client
 * (server/lib/myanimelist.ts) parses MAL's response with toTopAnimePage, the
 * /api/top-anime route returns the result, and the browser ("Show more")
 * reads it back with readTopAnimePage. Only the fields the page renders are
 * kept.
 *
 * MAL's ranking has one show per rank and no adult titles (measured over the
 * top 2,000: no gaps, no repeats, nsfw=true changes nothing). Pages are
 * fetched and cached separately, so a show can still cross a page boundary
 * between fetches: dedupeByMalId keeps the first copy.
 */

export interface TopAnimeItem {
  malId: number;
  /** The show's place in MyAnimeList's ranking; null if MAL ever sends an entry without one. */
  rank: number | null;
  /** MyAnimeList's main (usually romaji) title. */
  title: string;
  titleEnglish: string | null;
  /** MyAnimeList's mean score, 1–10 with two decimals. */
  score: number | null;
  imageUrl: string | null;
  /** "TV", "Movie", "OVA", ... */
  type: string | null;
  episodes: number | null;
  year: number | null;
  /** MyAnimeList members (users with the show on their list). */
  members: number | null;
}

export interface TopAnimePage {
  items: TopAnimeItem[];
  hasNextPage: boolean;
  currentPage: number;
}

export type TopAnimeResult =
  | { ok: true; page: TopAnimePage }
  | { ok: false; error: string; rateLimited: boolean };

/** Shows per page (MAL's `limit`): the banner's "top 25 at a glance" and the Octagram both live on page 1. */
export const TOP_ANIME_PAGE_SIZE = 25;
/** Input bound for ?page (50,000 shows): past the end of MAL's ranking, which ends the list first. */
export const MAX_TOP_ANIME_PAGE = 2000;

/** The ranking fields requested from MAL (the rest of each entry is never sent). */
export const MAL_RANKING_FIELDS =
  "alternative_titles,mean,media_type,num_episodes,start_season,start_date,num_list_users";

/** A ?page value → a page number, or null when it isn't a whole number in 1…MAX_TOP_ANIME_PAGE. */
export function parseTopAnimePage(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,4}$/.test(value)) return null;
  const page = Number(value);
  return page >= 1 && page <= MAX_TOP_ANIME_PAGE ? page : null;
}

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asPositiveInt = (value: unknown): number | null => {
  const n = asNumber(value);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asHttpsUrl = (value: unknown): string | null => {
  const url = asString(value);
  return url && url.startsWith("https://") ? url : null;
};

/** MAL's media_type values → the labels the page shows (unknown types are left out). */
const MEDIA_TYPE_LABELS: Record<string, string> = {
  tv: "TV",
  tv_special: "TV Special",
  movie: "Movie",
  ova: "OVA",
  ona: "ONA",
  special: "Special",
  music: "Music",
  cm: "CM",
  pv: "PV",
};

export const mediaTypeLabel = (value: unknown): string | null => {
  const type = asString(value);
  return type ? (MEDIA_TYPE_LABELS[type.toLowerCase()] ?? null) : null;
};

/** The ~225px-wide cover: plenty for a ≤ 96px poster at 2x. */
const pickImage = (picture: unknown): string | null =>
  isRecord(picture) ? (asHttpsUrl(picture.medium) ?? asHttpsUrl(picture.large)) : null;

/** The season's year, else the start date's ("2003", "2003-04" or "2003-04-05"). */
const pickYear = (node: RawRecord): number | null => {
  if (isRecord(node.start_season)) {
    const year = asPositiveInt(node.start_season.year);
    if (year !== null) return year;
  }
  const date = asString(node.start_date);
  const match = date?.match(/^(\d{4})(?:-|$)/);
  return match ? Number(match[1]) : null;
};

/** One `{ node, ranking }` entry of MAL's ranking → the fields the page renders, or null without a usable id. */
export const toTopAnimeItem = (raw: unknown): TopAnimeItem | null => {
  if (!isRecord(raw) || !isRecord(raw.node)) return null;
  const node = raw.node;
  const malId = asPositiveInt(node.id);
  if (malId === null) return null;

  const titles = isRecord(node.alternative_titles) ? node.alternative_titles : {};
  const title = asString(node.title);
  const titleEnglish = asString(titles.en);
  return {
    malId,
    // The ranking's own position: node.rank (the show's rank field) can lag it by one.
    rank: isRecord(raw.ranking) ? asPositiveInt(raw.ranking.rank) : null,
    title: title ?? titleEnglish ?? `MyAnimeList #${malId}`,
    titleEnglish,
    score: asNumber(node.mean),
    imageUrl: pickImage(node.main_picture),
    type: mediaTypeLabel(node.media_type),
    // MAL sends 0 while the episode count is unknown.
    episodes: asPositiveInt(node.num_episodes),
    year: pickYear(node),
    members: asPositiveInt(node.num_list_users),
  };
};

/** A show can cross a page boundary between two separately cached pages. First one wins. */
export const dedupeByMalId = (
  existing: TopAnimeItem[],
  incoming: TopAnimeItem[] = []
): TopAnimeItem[] => {
  const seen = new Set(existing.map((item) => item.malId));
  const fresh: TopAnimeItem[] = [];
  for (const item of incoming) {
    if (seen.has(item.malId)) continue;
    seen.add(item.malId);
    fresh.push(item);
  }
  return fresh.length ? [...existing, ...fresh] : existing;
};

/** Ascending rank, unranked last (Array#sort is stable, so equal ranks keep MAL's order). */
const byRank = (a: TopAnimeItem, b: TopAnimeItem) => {
  if (a.rank === b.rank) return 0;
  if (a.rank === null) return 1;
  if (b.rank === null) return -1;
  return a.rank - b.rank;
};

/** MAL's `{ data, paging }` → a page, or null when the body isn't a ranking. `paging.next` is absent on the last page. */
export function toTopAnimePage(json: unknown, page: number): TopAnimePage | null {
  if (!isRecord(json) || !Array.isArray(json.data)) return null;
  const items = json.data
    .map(toTopAnimeItem)
    .filter((item): item is TopAnimeItem => item !== null);
  const paging = isRecord(json.paging) ? json.paging : {};
  return {
    items: dedupeByMalId([], items).sort(byRank),
    hasNextPage: asString(paging.next) !== null,
    currentPage: page,
  };
}

/** Keeps a TopAnimeItem's own fields when its shape is right (the browser re-reads /api/top-anime's JSON). */
const readItem = (raw: unknown): TopAnimeItem | null => {
  if (!isRecord(raw)) return null;
  const malId = asPositiveInt(raw.malId);
  const title = asString(raw.title);
  if (malId === null || title === null) return null;
  return {
    malId,
    rank: asPositiveInt(raw.rank),
    title,
    titleEnglish: asString(raw.titleEnglish),
    score: asNumber(raw.score),
    imageUrl: asHttpsUrl(raw.imageUrl),
    type: asString(raw.type),
    episodes: asPositiveInt(raw.episodes),
    year: asPositiveInt(raw.year),
    members: asPositiveInt(raw.members),
  };
};

/** /api/top-anime's `{ page }` body → the page, or null (e.g. an HTML error page from a proxy). */
export function readTopAnimePage(json: unknown): TopAnimePage | null {
  if (!isRecord(json) || !isRecord(json.page)) return null;
  const { items, hasNextPage } = json.page;
  const currentPage = asPositiveInt(json.page.currentPage);
  if (!Array.isArray(items) || currentPage === null) return null;
  return {
    items: items.map(readItem).filter((item): item is TopAnimeItem => item !== null),
    hasNextPage: hasNextPage === true,
    currentPage,
  };
}
