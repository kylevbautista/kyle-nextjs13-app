import { SEASON_LIST_FILTER } from "./allCurrAnimeTag";
import { mediaFieldsFragment } from "./mediaFields";

/**
 * The landing page's cached extras (one request, Next data cache, 1 h):
 * - tempest: the Tensura franchise, full media snapshots plus banners
 * - mascot:  the Rimuru Tempest character (name, portrait, AniList page)
 * - count1–3: the season's ids with the season page's filter (SEASON_LIST_FILTER;
 *   sort: ID keeps the pages stable), so the landing can state an exact show
 *   count (150 at most, "150+" past that).
 *   pageInfo.total is never used: AniList reports 5000 for most filters.
 *
 * Every root field is wrapped in Page(), so an id that disappears yields an
 * empty list instead of an error that nulls the whole response.
 * Parsed by lib/landing.ts#parseLandingExtras, one part at a time.
 */
export const landingExtrasQuery = `
query LandingExtras($ids: [Int], $characterId: Int, $season: MediaSeason, $seasonYear: Int) {
  tempest: Page(page: 1, perPage: 10) {
    media(id_in: $ids, type: ANIME, sort: START_DATE) {
      ...mediaFields
      bannerImage
    }
  }
  mascot: Page(page: 1, perPage: 1) {
    characters(id: $characterId) {
      id
      name {
        full
        native
      }
      image {
        large
      }
      siteUrl
    }
  }
  count1: Page(page: 1, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    media(season: $season, seasonYear: $seasonYear, ${SEASON_LIST_FILTER}, sort: ID) {
      id
    }
  }
  count2: Page(page: 2, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    media(season: $season, seasonYear: $seasonYear, ${SEASON_LIST_FILTER}, sort: ID) {
      id
    }
  }
  count3: Page(page: 3, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    media(season: $season, seasonYear: $seasonYear, ${SEASON_LIST_FILTER}, sort: ID) {
      id
    }
  }
}
${mediaFieldsFragment}
`;
