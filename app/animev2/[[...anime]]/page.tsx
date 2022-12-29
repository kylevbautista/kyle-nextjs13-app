/**
 * Optionl Catch-all dyanmic segment
 * Cacthes:
 * /anime,
 * /anime/year
 * /anime/year/season
 * Then uses regex to verify correct slugs/params
 */
import { Suspense } from "react";
import Boundary from "./Boundary";

export const revalidate = 60;

export default async function Anime({ params }: any) {
  const { anime = [] } = params;
  const [year = "", season = ""] = anime;

  return (
    <div>
      <p>This is a Catch all for anime</p>
      <Suspense fallback={<p>Loading...</p>}>
        {/* @ts-ignore */}
        {/* <Test /> */}
        {/* @ts-ignore */}
        <Boundary year={year} season={season} />
      </Suspense>
    </div>
  );
}

// export async function generateStaticParams() {
//   const dateObject = new Date();
//   const year = dateObject.getUTCFullYear();
//   const parsedYear = year.toString();
//   let paths: any = [];

//   // for (let i = year - 5; i <= year + 1; i++) {
//   //   paths.push({ year: i.toString(), season: "winter" });
//   //   paths.push({ year: i.toString(), season: "spring" });
//   //   paths.push({ year: i.toString(), season: "summer" });
//   //   paths.push({ year: i.toString(), season: "fall" });
//   // }

//   return paths;
// }
