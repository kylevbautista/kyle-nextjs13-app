import { mediaFieldsFragment } from "./mediaFields";

/** One season, 50 per page, most popular first (TV_SHORT and ONA excluded). */
export const allCurrAnimeTag = `
query allCurrAnimeTag($page: Int, $year: Int, $season: MediaSeason) {
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
}
${mediaFieldsFragment}
`;
