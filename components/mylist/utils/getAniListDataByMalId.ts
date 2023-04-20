import { print as stringifyTag } from "graphql";
import findByMalIdQuery from "../../utils/graphql/tags/findByMalIdQuery.graphql";
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
        `getAniListDataByMalId`,
        res.headers.get("x-ratelimit-remaining")
      );
    if (res.status !== 200) {
      return {};
    }
    const limitRemaining = Number(res.headers.get("x-ratelimit-remaining"));
    if (limitRemaining < 20) {
      await sleep(1500);
    }
    // if (limitRemaining < 20) {
    //   return null;
    // }

    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const getAniListDataByMalIdList = async (
  list: any,
  enableLogs = false
) => {
  const numOfPromises = Math.ceil(list.length / 50);
  const ids = list.map((item: any) => item.id);

  try {
    let promises = [];
    for (let i = 0; i < numOfPromises; i++) {
      let promise = fetchWithTimeout(
        `${process.env.NEXT_PUBLIC_GRAPHQL_ANILIST}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: stringifyTag(findByMalIdQuery),
            variables: {
              page: i + 1,
              ids: ids,
            },
          }),
          timeout: 8000,
        }
      );
      promises.push(promise);
    }
    const response = await Promise.all(promises);
    if (enableLogs) {
      console.log(
        `getAniListDataByMalId`,
        response[0].headers.get("x-ratelimit-remaining")
      );
    }
    const data = await Promise.all(response.map((res) => res.json()));

    return data;
  } catch (err) {
    console.log(err);
    return null;
  }
};
