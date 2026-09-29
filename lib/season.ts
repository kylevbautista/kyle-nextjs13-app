/**
 * Single source of truth for anime-season math.
 *
 * Seasons follow the anime-industry premiere convention (all in UTC):
 *   winter = Jan–Mar, spring = Apr–Jun, summer = Jul–Sep, fall = Oct–Dec
 *
 * Everything that needs "the current season" or "the valid year window"
 * (routing, nav links, static params, the season header) must use this file.
 */

export const SEASONS = ["winter", "spring", "summer", "fall"] as const;
export type SeasonName = (typeof SEASONS)[number];

/** How far back / ahead of the current UTC year season pages are allowed. */
export const YEARS_BACK = 5;
export const YEARS_AHEAD = 1;

export const SEASON_LABELS: Record<SeasonName, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

/** Months covered by each season, for display ("January – March"). */
export const SEASON_MONTHS: Record<SeasonName, { from: string; to: string }> = {
  winter: { from: "January", to: "March" },
  spring: { from: "April", to: "June" },
  summer: { from: "July", to: "September" },
  fall: { from: "October", to: "December" },
};

export const isSeasonName = (value: unknown): value is SeasonName =>
  typeof value === "string" && (SEASONS as readonly string[]).includes(value);

/** 0-based month index (0 = January) → season. */
export const seasonForMonth = (monthIndex: number): SeasonName =>
  SEASONS[Math.min(3, Math.max(0, Math.floor(monthIndex / 3)))];

export const getCurrentSeason = (
  now: Date = new Date()
): { year: number; season: SeasonName } => ({
  year: now.getUTCFullYear(),
  season: seasonForMonth(now.getUTCMonth()),
});

export const seasonPath = (year: number | string, season: SeasonName) =>
  `/anime/${year}/${season}`;

export const currentSeasonPath = (now: Date = new Date()) => {
  const { year, season } = getCurrentSeason(now);
  return seasonPath(year, season);
};

export const validYearRange = (now: Date = new Date()) => {
  const year = now.getUTCFullYear();
  return { min: year - YEARS_BACK, max: year + YEARS_AHEAD };
};

export const isValidSeasonYear = (year: number, now: Date = new Date()) => {
  const { min, max } = validYearRange(now);
  return Number.isInteger(year) && year >= min && year <= max;
};

/** Step `delta` seasons forward (positive) or back (negative), crossing years. */
export const shiftSeason = (
  year: number,
  season: SeasonName,
  delta: number
): { year: number; season: SeasonName } => {
  const absolute = year * 4 + SEASONS.indexOf(season) + delta;
  return { year: Math.floor(absolute / 4), season: SEASONS[((absolute % 4) + 4) % 4] };
};

/** Every (year, season) pair in the valid window, oldest first. */
export const allSeasonParams = (now: Date = new Date()) => {
  const { min, max } = validYearRange(now);
  const params: { year: number; season: SeasonName }[] = [];
  for (let year = min; year <= max; year++) {
    for (const season of SEASONS) params.push({ year, season });
  }
  return params;
};

/**
 * Validates `/anime/<year>/<season>` segments.
 * Returns the redirect target when they are invalid, or null when they are fine.
 * Season matching is case-insensitive; extra segments are rejected.
 */
export const seasonRouteRedirect = (
  segments: string[],
  now: Date = new Date()
): string | null => {
  const [yearParam = "", seasonParam = "", ...rest] = segments;
  const year = Number(yearParam);
  const season = seasonParam.toLowerCase();

  if (!/^\d{4}$/.test(yearParam) || !isValidSeasonYear(year, now)) {
    return currentSeasonPath(now);
  }
  if (!isSeasonName(season)) {
    return currentSeasonPath(now);
  }
  if (season !== seasonParam || rest.length > 0) {
    return seasonPath(year, season);
  }
  return null;
};

/** First instant of a season (UTC), in epoch ms. */
export const seasonStartMs = (year: number, season: SeasonName) =>
  Date.UTC(year, SEASONS.indexOf(season) * 3, 1);

/** AniList FuzzyDateInt (YYYYMMDD) for an epoch-ms instant (UTC). */
export const toFuzzyDateInt = (ms: number) => {
  const date = new Date(ms);
  return date.getUTCFullYear() * 10_000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
};
