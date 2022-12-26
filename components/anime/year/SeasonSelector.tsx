"use client";
import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useEffect } from "react";
import { Season, getSeasonFromEnum } from "./helpers";

interface PageProps {
  byPopularity: any;
  year: any;
  season: Season;
  contextFound: any;
}

export default function SeasonSelector({
  byPopularity,
  year,
  season,
  contextFound,
}: PageProps) {
  const router = useRouter();

  const displaySeasonText = {
    0: {
      from: "December",
      to: "February",
    },
    1: {
      from: "March",
      to: "May",
    },
    2: {
      from: "June",
      to: "August",
    },
    3: {
      from: "September",
      to: "November",
    },
  };

  const onClickHandler = (event: any) => {};

  const byPopularityStyles = byPopularity
    ? "flex items-center h-[44px] border-b border-white cursor-pointer text-white font-bold hover:border-white"
    : "flex items-center h-[44px] border-b border-transparent cursor-pointer text-[rgb(164,164,164)] hover:border-white";

  const byCountDownStyles = !byPopularity
    ? "flex items-center h-[44px] border-b border-white cursor-pointer text-white font-bold hover:border-white"
    : "flex items-center h-[44px] border-b border-transparent cursor-pointer text-[rgb(164,164,164)] hover:border-white";

  useEffect(() => {
    // const dateObject = new Date();
    // const currentYear = dateObject.getUTCFullYear();
    // const prevYear = parseInt(year) - 1;
    // const nextYear = parseInt(year) + 1;
    // if (!(nextYear > currentYear + 1)) {
    //   router.prefetch(`/anime/${nextYear}/winter`);
    // }
    // if (!(prevYear < currentYear - 5)) {
    //   router.prefetch(`/anime/${prevYear}/fall`);
    // }
    // router.prefetch(`/anime/${year}/winter`);
    // router.prefetch(`/anime/${year}/spring`);
    // router.prefetch(`/anime/${year}/summer`);
    // router.prefetch(`/anime/${year}/fall`);
  }, []);

  if (contextFound) {
    return null;
  }

  return (
    <div className="text-white flex flex-wrap justify-center items-end gap-5">
      <div className="text-white flex justify-center items-center gap-3 basis-full sm:flex-initial">
        <button
          id="season-back"
          className="hover:bg-[rgb(53,53,53)] rounded-[50%] fill-[rgb(149,204,255)] cursor-pointer"
          onClick={onClickHandler}
          value={`${season} ${year}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="34px"
            height="34px"
          >
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
          </svg>
        </button>
        <div className="flex flex-col">
          <div>
            <p
              className="
            text-xs
            text-[rgb(164,164,164)]
            "
            >
              {displaySeasonText[season]?.from} {year}-
              {displaySeasonText[season]?.to} {year}
            </p>
          </div>
          <div
            className="
        "
          >
            <h1 className="text-4xl">
              {getSeasonFromEnum(season)} {year} Anime
            </h1>
          </div>
        </div>
        <button
          id="season-forward"
          className="hover:bg-[rgb(53,53,53)] rounded-[50%] fill-[rgb(149,204,255)] cursor-pointer"
          onClick={onClickHandler}
          value={`${season} ${year}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="33px"
            height="33px"
          >
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
          </svg>
        </button>
      </div>
      <div className="flex justify-center items-center gap-5 basis-full sm:flex-initial">
        <div className={byPopularityStyles} onClick={onClickHandler}>
          <p className="">By Popularity</p>
        </div>
        <div className={byCountDownStyles} onClick={onClickHandler}>
          <p className="">By Countdown</p>
        </div>
      </div>
    </div>
  );
}
