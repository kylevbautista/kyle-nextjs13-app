"use client";
import React, { ReactNode, useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnimeInfoSkeleton from "./AnimeInfoSkeleton";
import Grid from "./../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import { HeaderContext } from "./layoutSelector/HeaderProvider";
import { getInitialTimes, getSeasonFromParams } from "./helpers";
import { parseAniListData } from "./utils/parseAniListData";
import useLazyLoad from "./utils/useLazyLoad";

interface PageBaseProps {
  data?: any;
  year?: any;
  params?: any;
  children?: ReactNode;
}

enum Season {
  WINTER,
  SPRING,
  SUMMER,
  FALL,
}

export default function PageBase({
  data,
  year,
  params,
  children,
}: PageBaseProps) {
  const header = useContext(HeaderContext);
  const { byCount, byPopularity, setByCount, setByPopularity } = header;
  const season = getSeasonFromParams(params.season);
  // if (header) {
  //   header.setHeaderYear(year);
  //   header.setHeaderSeason(getSeasonFromParams(params.season));
  // }
  const router = useRouter();

  const {
    winterByPopularity,
    winterByCountDown,
    springByPopularity,
    springByCountDown,
    summerByPopularity,
    summerByCountDown,
    fallByPopularity,
    fallByCountDown,
  } = parseAniListData(data);

  // winter
  const {
    observedRefCallBack: observedWinterPopRef,
    data: winterPopData,
    hasMore: winterPopHasMore,
  } = useLazyLoad(winterByPopularity);
  const {
    observedRefCallBack: observedWinterCountRef,
    data: winterCountData,
    hasMore: winterCountHasMore,
  } = useLazyLoad(winterByCountDown);
  // spring
  const {
    observedRefCallBack: observedSpringPopRef,
    data: springPopData,
    hasMore: springPopHasMore,
  } = useLazyLoad(springByPopularity);
  const {
    observedRefCallBack: observedSpringCountRef,
    data: springCountData,
    hasMore: springCountHasMore,
  } = useLazyLoad(springByCountDown);
  // summer
  const {
    observedRefCallBack: observedSummerPopRef,
    data: summerPopData,
    hasMore: summerPopHasMore,
  } = useLazyLoad(summerByPopularity);
  const {
    observedRefCallBack: observedSummerCountRef,
    data: summerCountData,
    hasMore: summerCountHasMore,
  } = useLazyLoad(summerByCountDown);
  // fall
  const {
    observedRefCallBack: observedFallPopRef,
    data: fallPopData,
    hasMore: fallPopHasMore,
  } = useLazyLoad(fallByPopularity);
  const {
    observedRefCallBack: observedFallCountRef,
    data: fallCountData,
    hasMore: fallCountHasMore,
  } = useLazyLoad(fallByCountDown);

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

  useEffect(() => {
    const dateObject = new Date();
    const currentYear = dateObject.getUTCFullYear();
    const prevYear = parseInt(year) - 1;
    const nextYear = parseInt(year) + 1;

    if (season === Season.WINTER) {
      router.prefetch(`/animev2/${prevYear}/fall`);
      router.prefetch(`/animev2/${year}/spring`);
    }
    if (season === Season.SPRING) {
      router.prefetch(`/animev2/${year}/winter`);
      router.prefetch(`/animev2/${year}/summer`);
    }
    if (season === Season.SUMMER) {
      router.prefetch(`/animev2/${year}/spring`);
      router.prefetch(`/animev2/${year}/fall`);
    }
    if (season === Season.FALL) {
      router.prefetch(`/animev2/${year}/summer`);
      router.prefetch(`/animev2/${nextYear}/winter`);
    }
  }, []);

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
      <Grid>
        {byCount &&
          season === Season.WINTER &&
          winterCountData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount && season === Season.WINTER && winterCountHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedWinterCountRef} />
        )}
        {byPopularity &&
          season === Season.WINTER &&
          winterPopData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity && season === Season.WINTER && winterPopHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedWinterPopRef} />
        )}
        {byCount &&
          season === Season.SPRING &&
          springCountData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount && season === Season.SPRING && springCountHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedSpringCountRef} />
        )}
        {byPopularity &&
          season === Season.SPRING &&
          springPopData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity && season === Season.SPRING && springPopHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedSpringPopRef} />
        )}
        {byCount &&
          season === Season.SUMMER &&
          summerCountData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount && season === Season.SUMMER && summerCountHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedSummerCountRef} />
        )}
        {byPopularity &&
          season === Season.SUMMER &&
          summerPopData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity && season === Season.SUMMER && summerPopHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedSummerPopRef} />
        )}
        {byCount &&
          season === Season.FALL &&
          fallCountData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount && season === Season.FALL && fallCountHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedFallCountRef} />
        )}
        {byPopularity &&
          season === Season.FALL &&
          fallPopData?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity && season === Season.FALL && fallPopHasMore && (
          <AnimeInfoSkeleton forwardedRef={observedFallPopRef} />
        )}
      </Grid>
    </div>
  );
}
