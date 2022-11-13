"use client";
import React, { ReactNode, useState } from "react";
import Grid from "../../common/Grid";
import AnimeInfoGrid from "./AnimeInfoGrid";
import { compareFnCountDown } from "./helpers";

interface PageBaseProps {
  data?: any;
  children?: ReactNode;
}

interface graphQLPageType {
  media: [];
}

export default function PageBase({ data, children }: PageBaseProps) {
  const [byCount, setByCount] = useState(true);
  const [byPopularity, setByPopularity] = useState(false);
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
  const { media: winterByPopularity } = winter || {};
  const { media: springByPopularity } = spring || {};
  const { media: summerByPopularity } = summer || {};
  const { media: fallByPopularity } = fall || {};

  const winterByCountDown = [...winterByPopularity]?.sort(compareFnCountDown);
  const springByCountDown = [...springByPopularity]?.sort(compareFnCountDown);
  const summerByCountDown = [...summerByPopularity]?.sort(compareFnCountDown);
  const fallByCountDown = [...fallByPopularity]?.sort(compareFnCountDown);

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
      <div className="w-full mb-4 flex justify-start gap-3">
        <button
          onClick={() => {
            // setByCount(false);
            // setByPopularity(true);
          }}
          className="bg-[rgb(38,38,38)] rounded-md p-2"
        >
          <p>Sort By Popularity</p>
        </button>
        <button
          onClick={() => {
            setByPopularity(false);
            setByCount(true);
          }}
          className="bg-[rgb(38,38,38)] rounded-md p-2"
        >
          <p>Sort By Count Down</p>
        </button>
      </div>
      <Grid>
        {byCount &&
          fallByCountDown?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} />
          ))}
        {byPopularity &&
          fallByPopularity?.map((info: any, index: number) => (
            <AnimeInfoGrid key={index} id={index} info={info} />
          ))}
      </Grid>
    </div>
  );
}
