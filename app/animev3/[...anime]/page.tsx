/**
 * Catch-all dyanmic segment
 *
 * Cacthes:
 * /anime/year
 * /anime/year/season
 * /anime/...
 *
 * Then uses regex (routechecker()) to verify correct slugs/params
 */
// import { Suspense } from "react";
import { redirect } from "next/navigation";
import Boundary from "./Boundary";
import { routeChecker } from "../../../components/animev3/utils/routeChecker";

export const revalidate = 60;

export default async function Anime({ params }: any) {
  const { anime = [] } = params;
  const [year = "", season = ""] = anime;
  const { redirectUrl } = routeChecker({ year: year, season: season });
  if (redirectUrl) {
    console.log("redirecting...");
    redirect(redirectUrl);
  }

  return (
    <div>
      {/* <Suspense fallback={<p>Loading...</p>}> */}
      {/* @ts-ignore */}
      <Boundary year={year} season={season} />
      {/* </Suspense> */}
    </div>
  );
}

export async function generateStaticParams() {
  const dateObject = new Date();
  const year = dateObject.getUTCFullYear();
  let paths: any = [];

  for (let i = year - 5; i <= year + 1; i++) {
    paths.push({ anime: [i.toString(), "winter"] });
    paths.push({ anime: [i.toString(), "spring"] });
    paths.push({ anime: [i.toString(), "summer"] });
    paths.push({ anime: [i.toString(), "fall"] });
  }

  return paths;
}
