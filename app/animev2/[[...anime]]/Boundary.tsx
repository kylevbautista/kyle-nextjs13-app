import { ReactNode } from "react";
import { mockFetch } from "../../../components/utils/mockFetch";
import PageBase from "../../../components/animev2/PageBase";
import allCurrentAnimeTag from "../../../graphql/tags/allCurrentAnimeTag.graphql";
// import { allCurrentAnimeQueryFetchString } from "../../../graphql/tags/allCurrentAnimeQueryFetchString";
import { redirect } from "next/navigation";
import { print as stringifyTag } from "graphql";
import { getCurrentSeasonPath } from "../../../components/anime/year/helpers";

interface PageBaseProps {
  data?: any;
  year?: any;
  season?: any;
  params?: any;
  children?: ReactNode;
}

const sleep = (ms: number) => {
  // console.log("sleeping...");
  return new Promise((r) => setTimeout(r, ms));
};
/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */
const getDataByYear = async (year: any) => {
  const parsedYear = parseInt(year);
  // for (let i = 0; i < 3; i++) {
  // console.log("attempt: ", i + 1);
  try {
    const res = await fetch(`${process.env.GRAPHQL_ANILIST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(allCurrentAnimeTag),
        variables: {
          year: parsedYear,
        },
      }),
    });
    // console.log(
    //   `getDataByYear ${parsedYear}`,
    //   res.headers.get("x-ratelimit-remaining")
    // );
    // console.log("status: ", res.status);
    if (res.status !== 200) {
      // console.log("res: ", res);
      // console.log("headers: ", res.headers);
      return {};
    }
    const limitRemaining = Number(res.headers.get("x-ratelimit-remaining"));
    // await sleep(500);
    // console.log("limitRemaining: ", limitRemaining);
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

export default async function Boundary({ year, season }: PageBaseProps) {
  const { data = {} } = (await getDataByYear(year)) || {};
  const obj = { year: year, season: season };
  return <PageBase year={year} params={obj} data={data} />;
}
