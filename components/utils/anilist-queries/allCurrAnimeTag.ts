import { mediaFieldsFragment } from "./mediaFields";

/**
 * Which of a season's entries the season page lists: every anime format
 * (TV, TV short, movie, special, OVA, ONA, music video, and entries with no
 * format), adult titles excluded. The landing's exact season count
 * (landingExtrasQuery.ts) uses the same filter, so its "AniList lists N"
 * matches the season page.
 */
export const SEASON_LIST_FILTER = "type: ANIME, isAdult: false";

/**
 * One season, 50 per page, most popular first (SEASON_LIST_FILTER; ties by
 * id, so the low-popularity tail keeps one order across page requests).
 *
 * With $withCarryOver (page 1 only) the same request also returns TV series
 * that started before the season and are still airing during it — one AniList
 * request either way. TV only: AniList lists 80–115 "still airing" TV shorts
 * and ONAs from earlier seasons, mostly stale, which would fill the 50-item
 * lists every season. See lib/anime/carryOver.ts:
 * - ended:  start < season start, end date after it (AniList skips null end dates here)
 * - airing: start < season start, still RELEASING today (no end date yet). For a
 *   season that hasn't started this is everything airing now, so it is sorted
 *   oldest first ($airingSort): the 50-item cap then drops the newest premieres,
 *   the ones least likely to continue.
 */
export const allCurrAnimeTag = `
query allCurrAnimeTag(
  $page: Int
  $year: Int
  $season: MediaSeason
  $withCarryOver: Boolean = false
  $startBefore: FuzzyDateInt
  $endAfter: FuzzyDateInt
  $airingSort: [MediaSort] = [POPULARITY_DESC]
) {
  page: Page(page: $page, perPage: 50) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(season: $season, seasonYear: $year, sort: [POPULARITY_DESC, ID], ${SEASON_LIST_FILTER}) {
      ...mediaFields
    }
  }
  ended: Page(page: 1, perPage: 50) @include(if: $withCarryOver) {
    media(
      type: ANIME
      format_in: [TV]
      isAdult: false
      startDate_lesser: $startBefore
      endDate_greater: $endAfter
      sort: POPULARITY_DESC
    ) {
      ...mediaFields
    }
  }
  airing: Page(page: 1, perPage: 50) @include(if: $withCarryOver) {
    media(
      type: ANIME
      format_in: [TV]
      isAdult: false
      status: RELEASING
      startDate_lesser: $startBefore
      sort: $airingSort
    ) {
      ...mediaFields
    }
  }
}
${mediaFieldsFragment}
`;
