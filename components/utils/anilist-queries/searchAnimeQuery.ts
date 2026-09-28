import { mediaFieldsFragment } from "./mediaFields";

/** Title search across all anime (any season, any format), best match first. */
export const searchAnimeQuery = `
query searchAnime($search: String, $page: Int, $perPage: Int) {
  page: Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(search: $search, type: ANIME, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      ...mediaFields
    }
  }
}
${mediaFieldsFragment}
`;
