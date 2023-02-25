import { print as stringifyTag } from "graphql";
import allCurrAnimeTag from "../../utils/graphql/tags/allCurrAnimeTag.graphql";
import { fetchWithTimeout } from "./fetchWithTimeout";

const sleep = (ms: number) => {
  return new Promise((r) => setTimeout(r, ms));
};

export const getAniListData = async ({
  year,
  season = "",
  timeout = 5000,
  enableLogs = false,
}: any) => {
  const parsedYear = parseInt(year);
  try {
    const res = await fetchWithTimeout(`${process.env.GRAPHQL_ANILIST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(allCurrAnimeTag),
        variables: {
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
