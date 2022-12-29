/**
 * Catch-all dyanmic segment
 * Cacthes:
 * /anime/year
 * /anime/year/season
 * /anime/...
 * Then uses regex to verify correct slugs/params
 */
// import { Suspense } from "react";
import Boundary from "./Boundary";

export const revalidate = 60;

export default async function Anime({ params }: any) {
  const { anime = [] } = params;
  const [year = "", season = ""] = anime;
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
