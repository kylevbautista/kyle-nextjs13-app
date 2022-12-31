import { ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import getUserAnimeListQuery from "../../graphql/tags/getUserAnimeList.graphql";
import { print as stringifyTag } from "graphql";
import Grid from "../common/Grid";
import AnimeInfoGrid from "../anime/year/AnimeInfoGrid";
import { getInitialTimes, getCurrentSeasonPath } from "../anime/year/helpers";
import {
  getAniListDataByMalId,
  getAniListDataByMalIdList,
} from "./utils/getAniListDataByMalId";

const test = async () => {
  // try {
  //   const data = fetch("https://api.jikan.moe/v4/seasons/2022/fall");
  //   const res = await (await data).json();
  //   console.log(res)
  // } catch (err) {
  //   return {};
  //   console.log(err);
  // }
  // const { data } = await getAniListDataByMalId({
  //   malId: 47917,
  //   title: "Bocchi the Rock!",
  // });
  // console.log(data);
  const data = await getAniListDataByMalIdList();
  console.log("done");
};

const getCurrentYear = (shifted: Boolean = false) => {
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();
  const currentMonth = dateObject.getUTCMonth();
  if (currentMonth === 11 && !shifted) {
    return currentYear + 1;
  }
  return currentYear;
};

const getUserAnimeList = async () => {
  const protocol = headers().get("x-forwarded-proto") || "http";
  const host = headers().get("host");
  /**
   * When using next-auth with server side calls,
   * must add cookies to req or else getSession won't work.
   */
  const cookies = headers().get("cookie");
  const baseUrl = `${protocol}://${host}`;
  try {
    /**
     * If calling /api routes from the server,
     * it must be an absolute url.
     * However, client side /api calls can be relative.
     */
    const res = await fetch(`${baseUrl}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${cookies}`,
      },
      body: JSON.stringify({
        query: stringifyTag(getUserAnimeListQuery),
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

interface PageBaseProps {
  session?: any;
  children?: ReactNode;
}

export default async function PageBase({ session, children }: PageBaseProps) {
  const { data = {} } = await getUserAnimeList();
  const list = data?.getUserAnimeList?.list || [];

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
      {list.length ? (
        <Grid>
          {list?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        </Grid>
      ) : (
        <div>
          <div>
            <p>Nothing in your anime watch list </p>
          </div>
          <div>
            <Link
              href={`/anime/${getCurrentYear(true)}/${getCurrentSeasonPath(
                null,
                true
              )}`}
              className="block p-6 bg-neutral-700 hover:bg-blue-500 rounded-xl"
            >
              Click Here To Add Anime
            </Link>
          </div>
        </div>
      )}
      <button className="border p-2 rounded-lg" onClick={test}>
        <p>Show More</p>
      </button>
    </div>
  );
}
