"use client";
import { ReactNode, useState, useContext } from "react";
import Link from "next/link";
import getUserAnimeListQuery from "../../graphql/tags/getUserAnimeList.graphql";
import { print as stringifyTag } from "graphql";
import { getCurrentSeasonPath } from "../anime/year/helpers";
import useSWR from "swr";
import { compareFnCountDown } from "../animev3/utils/parseAniListData";
import { getUserAnimeListClient } from "./utils/getUserAnimeList";
import { unixTimeStampToWeekDay } from "../animev3/utils/timeStampHelpers";
import { getSortedData } from "./utils/getSortedData";
import { HeaderContext } from "./layout/HeaderProvider";
import { List } from "./List";
import { Test } from "./Test";

const getCurrentYear = (shifted: Boolean = false) => {
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();
  const currentMonth = dateObject.getUTCMonth();
  if (currentMonth === 11 && !shifted) {
    return currentYear + 1;
  }
  return currentYear;
};

interface PageBaseProps {
  session?: any;
  children?: ReactNode;
}

export default function PageBase() {
  // const [option, setOption] = useState("Any");
  const header = useContext(HeaderContext);
  const { option, setOption } = header;
  const { data: list, isValidating } = useSWR(
    "/mylist",
    () => getUserAnimeListClient(),
    {
      refreshInterval: 5000,
    }
  );
  const listSorted = [...list]?.sort(compareFnCountDown);
  const { data } = getSortedData({ option, listSorted });

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
      {data?.length ? (
        <List list={data} />
      ) : (
        <div>
          <div>
            {option === "Any" ? (
              <p>Nothing in your anime watch list </p>
            ) : (
              <p>Nothing Airing on {option}</p>
            )}
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
      <div className="mt-4">
        <Test list={listSorted} shouldRefresh={!isValidating} />
      </div>
    </div>
  );
}
