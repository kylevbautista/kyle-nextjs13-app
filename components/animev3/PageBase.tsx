"use client";
import React, { ReactNode, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnimeInfoSkeleton from "./AnimeInfoSkeleton";
import Grid from "./../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import { HeaderContext } from "./layoutSelector/HeaderProvider";
import { HeaderSelectorSkeleton } from "./layoutSelector/HeaderSelectorSkeleton";
import { getInitialTimes, getSeasonFromParams } from "./helpers";
import { parseAniListData } from "./utils/parseAniListData";
import useLazyLoad from "./utils/useLazyLoad";
import { usePrefetch } from "./utils/usePrefetch";

interface PageBaseProps {
  data?: any;
  year?: any;
  params?: any;
  enablePrefetch?: Boolean;
  children?: ReactNode;
}

enum Season {
  WINTER,
  SPRING,
  SUMMER,
  FALL,
}

const getSeason = (season: Season) => {
  if (season === Season.WINTER) {
    return "Winter";
  }
  if (season === Season.SPRING) {
    return "Spring";
  }
  if (season === Season.SUMMER) {
    return "Summer";
  }
  if (season === Season.FALL) {
    return "Fall";
  }
};

export default function PageBase({
  data,
  year,
  params,
  enablePrefetch = true,
  children,
}: PageBaseProps) {
  const header = useContext(HeaderContext);
  const { byCount, byPopularity } = header;
  const season = getSeasonFromParams(params.season);

  const { parsedData, parsedDataTest } = parseAniListData({
    data,
    year,
    season: params.season,
    byCount,
    byPopularity,
  });

  const {
    observedRefCallBack: observedPopRef,
    data: popData,
    hasMore: popHasMore,
  } = useLazyLoad(parsedData.popularity);
  const {
    observedRefCallBack: observedCountRef,
    data: countData,
    hasMore: countHasMore,
  } = useLazyLoad(parsedData.countdown);

  const selectorDiv = !header.headerYear
    ? "w-full sm:mb-4 flex flex-wrap justify-center laptop:justify-between items-center"
    : "invisible";

  usePrefetch({
    year,
    season,
    enablePrefetch,
    header,
  });

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
      <div className={selectorDiv}>
        <HeaderSelectorSkeleton
          byPopularity={byPopularity}
          year={year}
          season={season}
          contextFound={header.headerYear}
        />
        {!header.headerYear && (
          <div className="bg-[rgb(38,38,38)] w-[350px] sm:w-[350px] h-[40px] flex items-center justify-between gap-3 p-2">
            <p className="text-bold font-bold">
              Sorted: {byCount ? "By Countdown" : "By Popularity"}
            </p>
            <p className="text-bold font-bold">Season: {getSeason(season)}</p>
          </div>
        )}
        {!header.headerYear && (
          <div className="border-b border-[rgb(38,38,38)] w-full"></div>
        )}
      </div>
      <Grid>
        {byCount &&
          countData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={info.idMal}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount && countHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedCountRef} />
        )}
        {byPopularity &&
          popData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={info.idMal}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity && popHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedPopRef} />
        )}
      </Grid>
    </div>
  );
}
