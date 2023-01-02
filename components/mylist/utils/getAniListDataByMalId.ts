import { print as stringifyTag } from "graphql";
import findByMalIdQuery from "../../../graphql/tags/findByMalIdQuery.graphql";
import { fetchWithTimeout } from "../../utils/fetchWithTimeout";

const sleep = (ms: number) => {
  return new Promise((r) => setTimeout(r, ms));
};

export const getAniListDataByMalId = async ({
  malId,
  title,
  timeout = 5000,
  enableLogs = false,
}: any) => {
  try {
    const res = await fetchWithTimeout(
      `${process.env.NEXT_PUBLIC_GRAPHQL_ANILIST}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: stringifyTag(findByMalIdQuery),
          variables: {
            idMal: malId,
            search: title,
          },
        }),
        timeout: timeout,
      }
    );
    if (enableLogs)
      console.log(
        `getAniListDataByMalId ${malId} ${title}`,
        res.headers.get("x-ratelimit-remaining")
      );
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
};

export const getAniListDataByMalIdList = async (list: any) => {
  let results: any = [];
  try {
    for (let i = 0; i < list.length; i++) {
      let id = list[i]?.idMal;
      let titleParam = list[i]?.title?.romaji;
      const { data } = await getAniListDataByMalId({
        malId: id,
        title: titleParam,
        enableLogs: false,
      });
      const { anime = {} } = data || {};
      results.push(anime);
    }
    return results;
  } catch (err) {
    console.log(err);
    return [];
  }
};
