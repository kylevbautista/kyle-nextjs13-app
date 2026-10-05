import { mediaFieldsFragment } from "./mediaFields";

/**
 * Title search, optionally narrowed by format, genre, season (with its year),
 * start year and release status (absent variables are ignored); never adult;
 * best match first. pageInfo asks for hasNextPage only: on title search
 * AniList's total and lastPage are false ("gundam": 5000 / 166, with 54
 * results), so lib/search.ts derives counts from hasNextPage. Variables come
 * from lib/search.ts#searchVariables.
 */
export const searchAnimeQuery = `
query searchAnime($search: String, $page: Int, $perPage: Int, $format: MediaFormat, $genre: String, $season: MediaSeason, $seasonYear: Int, $startAfter: FuzzyDateInt, $startBefore: FuzzyDateInt, $status: MediaStatus) {
  page: Page(page: $page, perPage: $perPage) {
    pageInfo {
      currentPage
      hasNextPage
    }
    media(search: $search, type: ANIME, isAdult: false, format: $format, genre: $genre, season: $season, seasonYear: $seasonYear, startDate_greater: $startAfter, startDate_lesser: $startBefore, status: $status, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      ...mediaFields
    }
  }
}
${mediaFieldsFragment}
`;
