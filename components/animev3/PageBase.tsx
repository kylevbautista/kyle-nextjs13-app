"use client";
import React, {
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { getAniListData } from "./utils/getAniListData";
import { compareFnCountDown } from "./utils/parseAniListData";

const clone = (items: any) =>
  items.map((item: any) => (Array.isArray(item) ? clone(item) : item));

const getAniListClient = async ({
  year,
  season,
  durr,
  setDurr,
  m1,
  m2,
  page,
  setPage,
  testData,
  setTestData,
}: any) => {
  const { data = {} } =
    (await getAniListData({
      page: page,
      year: year,
      season: season,
      timeout: 5000,
      enableLogs: false,
    })) || {};
  durr.page.pageInfo = data?.page?.pageInfo;
  data?.page?.media?.forEach((item: any) => {
    // Since I saved the reference to memory in the state,
    // Im actually mutating data.page.media when I mutate durr.page.media
    durr.page.media.push(item);
    testData.push(item);
  });
  setDurr({ ...durr });

  m1 && m1(true);
  m2 && m2(true);
  setTestData([...testData]);
  setPage(page + 1);
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
  const { byCount, byPopularity, prevCountRef } = header;
  const season = getSeasonFromParams(params.season);
  const [durr, setDurr] = useState(data);
  const [page, setPage] = useState(2);
  const [testData, setTestData] = useState(
    clone(data?.page?.media).sort(compareFnCountDown) || []
  );

  const {
    observedRefCallBack: observedCountRef,
    data: chunckedData,
    hasMore,
  } = useLazyLoad(
    testData,
    durr.page.pageInfo.hasNextPage,
    getAniListClient,
    {
      year: params.year,
      season: params.season,
      durr,
      setDurr,
      m1: null,
      m2: null,
      page,
      setPage,
      testData,
      setTestData,
    },
    byCount,
    prevCountRef
  );

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
    const count = clone(pop).sort(compareFnCountDown);
    if (byCount) {
      setTestData([...count]);
    } else {
      setTestData([...pop]);
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
        {chunckedData?.map((info: any, index: number) => (
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
      </Grid>
    </div>
  );
}
