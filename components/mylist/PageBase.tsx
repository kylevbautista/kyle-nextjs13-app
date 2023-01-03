"use client";
import { ReactNode } from "react";
import Link from "next/link";
import getUserAnimeListQuery from "../../graphql/tags/getUserAnimeList.graphql";
import { print as stringifyTag } from "graphql";
import { getCurrentSeasonPath } from "../anime/year/helpers";
import useSWR from "swr";
import { compareFnCountDown } from "../animev3/utils/parseAniListData";

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

const getUserAnimeListClient = async () => {
  try {
    /**
     * If calling /api routes from the server,
     * it must be an absolute url.
     * However, client side /api calls can be relative.
     */
    const res = await fetch(`/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(getUserAnimeListQuery),
      }),
    });
    const { data = null } = await res.json();
    if (data?.getUserAnimeList?.list) {
      return data?.getUserAnimeList?.list;
    }
    return data;
  } catch (err) {
    console.log(err);
  }
};

interface PageBaseProps {
  session?: any;
  children?: ReactNode;
}

export default function PageBase() {
  const { data: list, isValidating } = useSWR(
    "/mylist",
    () => getUserAnimeListClient(),
    {
      refreshInterval: 5000,
    }
  );
  const listSorted = [...list]?.sort(compareFnCountDown);
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
      {listSorted.length ? (
        <List list={listSorted} />
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
      <div className="mt-4">
        <Test list={listSorted} shouldRefresh={!isValidating} />
      </div>
    </div>
  );
}
