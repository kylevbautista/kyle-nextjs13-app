import { mediaFieldsFragment } from "./mediaFields";

/**
 * Title search across all anime (any season, any format, never adult), best
 * match first. pageInfo asks for hasNextPage only: on title search AniList's
 * total and lastPage are false ("gundam": 5000 / 166, with 54 results), so
 * lib/search.ts derives counts from hasNextPage.
 */
export const searchAnimeQuery = `
query searchAnime($search: String, $page: Int, $perPage: Int) {
  page: Page(page: $page, perPage: $perPage) {
    pageInfo {
      currentPage
      hasNextPage
    }
    media(search: $search, type: ANIME, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      ...mediaFields
    }
  }
}
${mediaFieldsFragment}
`;
