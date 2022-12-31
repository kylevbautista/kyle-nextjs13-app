import { print as stringifyTag } from "graphql";
import updateUserAnimeListMutation from "../../../graphql/tags/updateUserAnimeListMutation.graphql";

export const updateUserAnnimeList = async (info: any) => {
  try {
    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(updateUserAnimeListMutation),
        variables: {
          data: info,
        },
      }),
    });
    const { data = null } = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};
