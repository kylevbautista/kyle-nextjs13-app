"use client";
import React, { ReactNode, useEffect, useState } from "react";
import Grid from "../../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import { compareFnCountDown, getInitialTimes } from "./helpers";

interface PageBaseProps {
  data?: any;
  children?: ReactNode;
}

interface graphQLPageType {
  media: [];
}
enum Season {
  WINTER,
  SPRING,
  SUMMER,
  FALL
}

export default function PageBase({ data, children }: PageBaseProps) {
  const [byCount, setByCount] = useState(true);
  const [byPopularity, setByPopularity] = useState(false);
  const [season,setSeason] = useState<Season>(Season.FALL)


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

  let mainByCountDown = fallByCountDown;
  let mainByPopularity = fallByPopularity;
  if(season === Season.WINTER){
    mainByCountDown = winterByCountDown;
    mainByPopularity = winterByPopularity;
  }
  else if(season === Season.SPRING){
    mainByCountDown = springByCountDown;
    mainByPopularity = springByPopularity;
  }
  else if(season === Season.SUMMER){
    mainByCountDown = summerByCountDown;
    mainByPopularity = summerByPopularity;
  }
  else if(season === Season.FALL){
    mainByCountDown = fallByCountDown;
    mainByPopularity = fallByPopularity;
  }

  const getSeason = (season: Season) => {
    if(season === Season.WINTER){
      return 'Winter'
    }
    if(season === Season.SPRING){
      return 'Spring'
    }
    if(season === Season.SUMMER){
      return 'Summer'
    }
    if(season === Season.FALL){
      return 'Fall'
    }
  } 


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
      <div className="w-full mb-4 flex justify-between gap-3 items-center">
        <div className="flex gap-3 ">
          <button
            onClick={() => {
              setByCount(false);
              setByPopularity(true);
            }}
            className={byPopularity ? "rounded-md p-2 bg-neutral-700 font-bold" :"bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-blue-600"}
          >
            <p>Sort By Popularity</p>
          </button>
          <button
            onClick={() => {
              setByPopularity(false);
              setByCount(true);
            }}
            // className="bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-blue-600"
            className={byCount ? "rounded-md p-2 bg-neutral-700 font-bold" :"bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-blue-600"}
          >
            <p>Sort By Count Down</p>
          </button>
        </div>
        <div className="bg-[rgb(38,38,38)] w-[350px] h-[40px] flex items-center justify-between gap-3 p-2">
          <p className="text-bold font-bold">Sorted: {byCount? "By Countdown" : "By Popularity"}</p>
          <p className="text-bold font-bold">Season: {getSeason(season)}</p>
        </div>
        <div  className="flex gap-3">
          <button
            onClick={() => {
              setSeason(Season.WINTER);
            }}
            // className="bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-orange-500"
            className={(season===Season.WINTER) ? "rounded-md p-2 bg-neutral-700 font-bold" :"bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-orange-500"}
          >
            <p>Winter</p>
          </button>
          <button
            onClick={() => {
              setSeason(Season.SPRING);
            }}
            className={(season===Season.SPRING) ? "rounded-md p-2 bg-neutral-700 font-bold" :"bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-orange-500"}
          >
            <p>Spring</p>
          </button>
          <button
            onClick={() => {
              setSeason(Season.SUMMER);
            }}
            className={(season===Season.SUMMER) ? "rounded-md p-2 bg-neutral-700 font-bold" :"bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-orange-500"}
          >
            <p>Summer</p>
          </button>
          <button
            onClick={() => {
              setSeason(Season.FALL);
            }}
            className={(season===Season.FALL) ? "rounded-md p-2 bg-neutral-700 font-bold" :"bg-[rgb(38,38,38)] rounded-md p-2 hover:bg-orange-500"}
          >
            <p>Fall</p>
          </button>
        </div>
      </div>
      <Grid>
        {(byCount && season===Season.WINTER) &&
          winterByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byPopularity && season===Season.WINTER) &&
          winterByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byCount && season===Season.SPRING) &&
          springByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byPopularity && season===Season.SPRING) &&
          springByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byCount && season===Season.SUMMER) &&
          summerByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byPopularity && season===Season.SUMMER) &&
          summerByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byCount && season===Season.FALL) &&
          fallByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        {(byPopularity && season===Season.FALL) &&
          fallByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} initialTimes={getInitialTimes(info?.upcomingEpisode?.timeUntilAiring)} />
          ))}
        <AnimeInfoGrid key={1} id={1} info={{}} />
      </Grid>
    </div>
  );
}
