import { mediaFieldsFragment } from "./mediaFields";

/** Up to 50 media by AniList id (used by the server-side list refresh). */
export const mediaByIdsQuery = `
query mediaByIds($ids: [Int]) {
  page: Page(page: 1, perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      ...mediaFields
    }
  }
}
${mediaFieldsFragment}
`;
