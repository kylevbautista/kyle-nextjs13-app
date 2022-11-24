"use client";
import React, { ReactNode, useEffect, useState } from "react";
import Grid from "../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import SeasonSelector from "./SeasonSelector";
import {
  compareFnCountDown,
  getInitialTimes,
  getCurrentSeason,
} from "./helpers";

interface PageBaseProps {
  data?: any;
  year?: any;
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

export default function PageBase({ data, year, children }: PageBaseProps) {
  const [byCount, setByCount] = useState(true);
  const [byPopularity, setByPopularity] = useState(false);
  const [season, setSeason] = useState<Season>(getCurrentSeason());

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
      <div className="w-full mb-4 flex flex-wrap justify-center laptop:justify-between items-center">
        <SeasonSelector
          byPopularity={byPopularity}
          year={year}
          season={season}
          setByCount={setByCount}
          setByPopularity={setByPopularity}
          setSeason={setSeason}
        />
        <div className="bg-[rgb(38,38,38)] w-[350px] sm:w-[350px] h-[40px] flex items-center justify-between gap-3 p-2">
          <p className="text-bold font-bold">
            Sorted: {byCount ? "By Countdown" : "By Popularity"}
          </p>
          <p className="text-bold font-bold">Season: {getSeason(season)}</p>
          {/* <p className="text-bold font-bold">Year: {year}</p> */}
        </div>
        <div className="border-b border-[rgb(38,38,38)] w-full"></div>
      </div>
      <Grid>
        {byCount &&
          season === Season.WINTER &&
          winterByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity &&
          season === Season.WINTER &&
          winterByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount &&
          season === Season.SPRING &&
          springByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity &&
          season === Season.SPRING &&
          springByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount &&
          season === Season.SUMMER &&
          summerByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity &&
          season === Season.SUMMER &&
          summerByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byCount &&
          season === Season.FALL &&
          fallByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        {byPopularity &&
          season === Season.FALL &&
          fallByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        <AnimeInfoGrid key={1} id={1} info={{}} />
      </Grid>
    </div>
  );
}
