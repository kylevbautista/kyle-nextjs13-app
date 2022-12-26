"use client";
import React, {
  ReactNode,
  useState,
  useContext,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import AnimeInfoSkeleton from "./AnimeInfoSkeleton";
import Grid from "../../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import SeasonSelector from "./SeasonSelector";
import { HeaderContext } from "../HeaderProvider";
import {
  compareFnCountDown,
  getInitialTimes,
  getCurrentSeason,
  getSeasonFromParams,
  sliceIntoChunks,
} from "./helpers";
import useLazyLoad from "../utils/useLazyLoad";

interface PageBaseProps {
  data?: any;
  year?: any;
  params?: any;
  children?: ReactNode;
}

interface graphQLPageType {
  media: [];
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
  const [season, setSeason] = useState<Season>(
    getSeasonFromParams(params.season)
  );
  header.setHeaderYear(year);
  header.setHeaderSeason(getSeasonFromParams(params.season));
  const router = useRouter();

  const {
    winter,
    spring,
    summer,
    fall,
  }: {
    winter: graphQLPageType;
    spring: graphQLPageType;
    summer: graphQLPageType;
    fall: graphQLPageType;
  } = data || {};
  const { media: winterByPopularity = [] } = winter || {};
  const { media: springByPopularity = [] } = spring || {};
  const { media: summerByPopularity = [] } = summer || {};
  const { media: fallByPopularity = [] } = fall || {};

  const winterByCountDown = [...winterByPopularity]?.sort(compareFnCountDown);
  const springByCountDown = [...springByPopularity]?.sort(compareFnCountDown);
  const summerByCountDown = [...summerByPopularity]?.sort(compareFnCountDown);
  const fallByCountDown = [...fallByPopularity]?.sort(compareFnCountDown);

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
  // season === Season.FALL &&
  //   console.log("Kylelog length", {
  //     fallPopData: fallPopData.length,
  //     fallCountData: fallCountData.length,
  //   });
  // season === Season.SUMMER &&
  //   console.log("Kylelog length", {
  //     summerPopData: summerPopData.length,
  //     summerCountData: summerCountData.length,
  //   });
  // season === Season.SPRING &&
  //   console.log("Kylelog length", {
  //     springPopData: springPopData.length,
  //     springCountData: springCountData.length,
  //   });
  // season === Season.WINTER &&
  //   console.log("Kylelog length", {
  //     winterPopData: winterPopData.length,
  //     winterCountData: winterCountData.length,
  //   });

  const selectorDiv = !header.headerYear
    ? "w-full sm:mb-4 flex flex-wrap justify-center laptop:justify-between items-center"
    : "invisible";

  useEffect(() => {
    console.log("kylelog data", data);
    const dateObject = new Date();
    const currentYear = dateObject.getUTCFullYear();
    const prevYear = parseInt(year) - 1;
    const nextYear = parseInt(year) + 1;
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

    if (season === Season.WINTER) {
      router.prefetch(`/anime/${prevYear}/fall`);
      router.prefetch(`/anime/${year}/spring`);
    }
    if (season === Season.SPRING) {
      router.prefetch(`/anime/${year}/winter`);
      router.prefetch(`/anime/${year}/summer`);
    }
    if (season === Season.SUMMER) {
      router.prefetch(`/anime/${year}/spring`);
      router.prefetch(`/anime/${year}/fall`);
    }
    if (season === Season.FALL) {
      router.prefetch(`/anime/${year}/summer`);
      router.prefetch(`/anime/${nextYear}/winter`);
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
      <div className={selectorDiv}>
        <SeasonSelector
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
