import getUserAnimeListQuery from "../../../graphql/tags/getUserAnimeList.graphql";
import { print as stringifyTag } from "graphql";

export const getUserAnimeListClient = async () => {
  try {
    /**
     * If calling /api routes from the server,
     * it must be an absolute url.
     * However, client side /api calls can be relative.
     */
    const res = await fetch(`/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(getUserAnimeListQuery),
      }),
    });
    const { data = null } = await res.json();
    if (data?.getUserAnimeList?.list) {
      return data?.getUserAnimeList?.list;
    }
    return data;
  } catch (err) {
    console.log(err);
  }
};
