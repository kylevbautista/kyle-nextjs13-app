"use client";
import React, { ReactNode, useContext, useEffect, useState } from "react";
import AnimeInfoSkeleton from "./AnimeInfoSkeleton";
import Grid from "./../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import { HeaderContext } from "./layoutSelector/HeaderProvider";
import { HeaderSelectorSkeleton } from "./layoutSelector/HeaderSelectorSkeleton";
import { getInitialTimes, getSeasonFromParams } from "./helpers";
import useLazyLoad from "./utils/useLazyLoad";
import { usePrefetch } from "./utils/usePrefetch";
import { getAniListData } from "./utils/getAniListData";
import { compareFnCountDown } from "./helpers";

const clone = (items: any) =>
  items.map((item: any) => (Array.isArray(item) ? clone(item) : item));

const getAniListClient = async ({
  year,
  season,
  dataReference,
  setDataReference,
  page,
  setPage,
  animeList,
  setAnimeList,
}: any) => {
  try {
    const { data = {} } =
      (await getAniListData({
        page: page,
        year: year,
        season: season,
        timeout: 8000,
        enableLogs: false,
      })) || {};
    dataReference.page.pageInfo = data?.page?.pageInfo || {
      hasNextPage: false,
    };
    data?.page?.media?.forEach((item: any) => {
      // Since I saved the obj mem reference in the state,
      // Im actually mutating data.page.media when I mutate dataReference.page.media
      dataReference.page.media.push(item);
      animeList.push(item);
    });
    setDataReference({ ...dataReference });

    setAnimeList([...animeList]);
    setPage(page + 1);
  } catch (err) {
    console.log(err);
  }
};

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
  const [dataReference, setDataReference] = useState(data);
  const [page, setPage] = useState(2);
  const [animeList, setAnimeList] = useState(
    clone(data?.page?.media).sort(compareFnCountDown) || []
  );
  const [option, setOption] = useState(byCount ? true : false);

  const {
    observedRefCallBack: observedCountRef,
    chunkedData,
    hasMore,
  } = useLazyLoad({
    data: animeList,
    hasNextPage: dataReference.page.pageInfo.hasNextPage,
    callback: getAniListClient,
    callBackParams: {
      year: params.year,
      season: params.season,
      dataReference,
      setDataReference,
      page,
      setPage,
      animeList,
      setAnimeList,
    },
    sortSelect: option,
  });

  const selectorDiv = !header.headerYear
    ? "w-full sm:mb-4 flex flex-wrap justify-center laptop:justify-between items-center"
    : "invisible";

  usePrefetch({
    year,
    season,
    enablePrefetch,
    header,
  });

  useEffect(() => {
    const pop = data.page?.media;

    // Deep cloning due to sort method directly affecting the original data
    const count = clone(pop).sort(compareFnCountDown);

    if (byCount) {
      setAnimeList([...count]);

      // cant use global byCount inside useLazy directly since it is set before new data is set
      // so creating local option toggler to keep track and avoid race condition
      setOption(!option);
    } else {
      setAnimeList([...pop]);

      // cant use global byCount directly useLazy directly since it is set before new data is set
      // so creating local option toggler to keep track and avoid race condition
      setOption(!option);
    }
  }, [byCount]);

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
        {chunkedData?.map((info: any, index: number) => (
          <AnimeInfoGrid
            key={info.idMal || index}
            id={index}
            info={info}
            initialTimes={getInitialTimes(
              info?.upcomingEpisode?.timeUntilAiring
            )}
          />
        ))}
        {hasMore && <AnimeInfoSkeleton forwardedRef={observedCountRef} />}
        {hasMore && <AnimeInfoSkeleton />}
        {hasMore && <AnimeInfoSkeleton />}
        {hasMore && <AnimeInfoSkeleton />}
        {hasMore && <AnimeInfoSkeleton />}
      </Grid>
    </div>
  );
}
