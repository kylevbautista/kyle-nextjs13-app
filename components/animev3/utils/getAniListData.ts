import { print as stringifyTag } from "graphql";
import allCurrAnimeTag from "../../utils/graphql/tags/allCurrAnimeTag.graphql";
import { fetchWithTimeout } from "./fetchWithTimeout";

const sleep = (ms: number) => {
  return new Promise((r) => setTimeout(r, ms));
};

export const getAniListData = async ({
  page = 1,
  year,
  season = "",
  timeout = 5000,
  enableLogs = false,
}: any) => {
  const url = process.env.GRAPHQL_ANILIST
    ? process.env.GRAPHQL_ANILIST
    : process.env.NEXT_PUBLIC_GRAPHQL_ANILIST;
  const parsedYear = parseInt(year);
  try {
    const res = await fetchWithTimeout(`${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(allCurrAnimeTag),
        variables: {
          page: page,
          year: parsedYear,
          season: season.toUpperCase(),
        },
      }),
      timeout: timeout,
    });
    if (enableLogs)
      console.log(
        `getDataByYear ${parsedYear} ${season}`,
        res.headers.get("x-ratelimit-remaining")
      );
    // console.log("status: ", res.status);
    if (res.status !== 200) {
      return {};
    }
    const limitRemaining = Number(res.headers.get("x-ratelimit-remaining"));
    if (limitRemaining < 20) {
      await sleep(1500);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
  // }
};
