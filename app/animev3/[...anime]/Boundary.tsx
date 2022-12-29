import { ReactNode } from "react";
import { mockFetch } from "../../../components/utils/mockFetch";
import PageBase from "../../../components/animev3/PageBase";
import allCurrentAnimeTag from "../../../graphql/tags/allCurrentAnimeTag.graphql";
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
  return new Promise((r) => setTimeout(r, ms));
};
const getDataByYear = async (year: any) => {
  const parsedYear = parseInt(year);
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
    console.log(
      `getDataByYear ${parsedYear}`,
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

export default async function Boundary({ year, season }: PageBaseProps) {
  const { data = {} } = (await getDataByYear(year)) || {};
  const obj = { year: year, season: season };
  return <PageBase year={year} params={obj} data={data} />;
}
