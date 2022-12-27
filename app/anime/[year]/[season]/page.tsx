import PageBase from "../../../../components/anime/year/PageBase";
import allCurrentAnimeTag from "../../../../graphql/tags/allCurrentAnimeTag.graphql";
// import { allCurrentAnimeQueryFetchString } from "../../../../graphql/tags/allCurrentAnimeQueryFetchString";
import { redirect } from "next/navigation";
import { print as stringifyTag } from "graphql";
import { getCurrentSeasonPath } from "../../../../components/anime/year/helpers";

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
      next: { revalidate: 60 },
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

export default async function AnimeInfoByYear({ params }: any) {
  const regExExpression = /^\d{4}$/;
  const dateObject = new Date();
  let currentYear = dateObject.getUTCFullYear();
  const currentMonth = dateObject.getUTCMonth();

  if (regExExpression.test(params.year)) {
    const parsedIntYear = parseInt(params.year);
    if (parsedIntYear < currentYear - 5 || parsedIntYear > currentYear + 1) {
      // if (currentMonth === 11) {
      //   currentYear = currentYear + 1;
      // }
      redirect(`/anime/${currentYear}/${getCurrentSeasonPath(null, true)}`);
    }
  } else {
    // if (currentMonth === 11) {
    //   currentYear = currentYear + 1;
    // }
    redirect(`/anime/${currentYear}/${getCurrentSeasonPath(null, true)}`);
  }

  const { data = null } = await getDataByYear(params.year);
  return <PageBase year={params.year} params={params} data={data} />;
}

/**
 * For some reason we need this to enable dynamic segment caching
 * when its supposed to be on by default if passing cache parameter into
 * fetch in dyanmic segment. Without this function, even with cache enabled
 * passed, any new dyanmic routes don't get cached.
 *
 */
export async function generateStaticParams() {
  const dateObject = new Date();
  const year = dateObject.getUTCFullYear();
  const parsedYear = year.toString();
  let paths: any = [];

  // for (let i = year - 5; i <= year + 1; i++) {
  //   paths.push({ year: i.toString(), season: "winter" });
  //   paths.push({ year: i.toString(), season: "spring" });
  //   paths.push({ year: i.toString(), season: "summer" });
  //   paths.push({ year: i.toString(), season: "fall" });
  // }

  return paths;
}
