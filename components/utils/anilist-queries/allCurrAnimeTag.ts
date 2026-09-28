import { mediaFieldsFragment } from "./mediaFields";

/**
 * One season, 50 per page, most popular first (TV_SHORT and ONA excluded).
 *
 * With $withCarryOver (page 1 only) the same request also returns TV series
 * that started before the season and are still airing during it — one AniList
 * request either way. See lib/anime/carryOver.ts:
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
    media(
      season: $season
      seasonYear: $year
      sort: POPULARITY_DESC
      isAdult: false
      format_not_in: [TV_SHORT, ONA]
    ) {
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
