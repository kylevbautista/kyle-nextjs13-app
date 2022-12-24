import { redirect } from "next/navigation";
import { getCurrentSeasonPath } from "../../../components/anime/year/helpers";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

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
  // const { data } = (await getDataByYear(params.year)) || {};
  // return <PageBase year={params.year} data={data} />;
  return null;
}

/**
 * For some reason we need this to enable dynamic segment caching
 * when its supposed to be on by default if passing cache parameter into
 * fetch in dyanmic segment. Without this function, even with cache enabled
 * passed, any new dyanmic routes don't get cached.
 *
 */
// export async function generateStaticParams() {
//   const dateObject = new Date();
//   const year = dateObject.getUTCFullYear();
//   const parsedYear = year.toString();
//   let paths = [];

//   for (let i = year - 5; i <= year + 1; i++) {
//     paths.push({ year: i.toString() });
//   }

//   return paths;
// }
