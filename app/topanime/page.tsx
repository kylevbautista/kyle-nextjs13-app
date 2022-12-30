// import { Suspense } from "react";
import { Boundary } from "./Boundary";

export const revalidate = 60;

export default async function TopAnime() {
  return (
    <div
      id="container"
      className="
        flex 
        flex-col 
        justify-center 
        items-center 
        sm:p-4
        text-white
      "
    >
      <div className="pb-4">
        <p className="text-4xl">Ranking</p>
      </div>
      {/* <Suspense fallback={<p>Loading Top Anime...</p>}> */}
      {/* @ts-ignore */}
      <Boundary />
      {/* </Suspense> */}
    </div>
  );
}
