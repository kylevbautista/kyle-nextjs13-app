import PageBase from "../../components/year/PageBase";
import allCurrentAnimeQueryFetch from "../../graphQL/queries/allCurrentAnimeQueryFetch";
import { redirect } from "next/navigation";
// import { setTimeout } from "timers/promises";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */
const getDataByYear = async (year: any) => {
  // await setTimeout(1000);
  const parsedYear = parseInt(year);
  try {
    const res = await fetch("https://graphql.anilist.co", {
      next: { revalidate: 30 },
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: allCurrentAnimeQueryFetch,
        variables: {
          year: parsedYear,
        },
      }),
    });
    const data = await res.json();
    // console.log(
    //   `getDataByYear ${parsedYear}`,
    //   res.headers.get("x-ratelimit-remaining")
    // );
    return data;
  } catch (err) {
    console.log(err);
  }
};

export default async function AnimeInfoByYear({ params }: any) {
  const regExExpression = /^\d{4}$/;
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();

  if (regExExpression.test(params.year)) {
    const parsedIntYear = parseInt(params.year);
    if (parsedIntYear < currentYear - 5 || parsedIntYear > currentYear + 1) {
      redirect(`/${currentYear}`);
    }
  } else {
    redirect(`/${currentYear}`);
  }
  const { data } = (await getDataByYear(params.year)) || {};
  return <PageBase year={params.year} data={data} />;
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
  let paths = [];

  for (let i = year - 5; i <= year + 1; i++) {
    paths.push({ year: i.toString() });
  }

  return paths;
}
