"use client";

import { useContext } from "react";
import { HeaderContext } from "./HeaderProvider";
import { HeaderSelector } from "./HeaderSelector";
import { getSeasonFromEnum, getSeasonFromParams } from "../helpers";

export function HeaderSelectorWrapper({ year, season }: any) {
  const header = useContext(HeaderContext);
  const { byCount, byPopularity, setByCount, setByPopularity } = header;

  return (
    <div
      id="container"
      className="
        flex 
        flex-col 
        justify-center 
        items-center 
        sm:pt-4 sm:px-4
        text-white
      "
    >
      <div
        className="
        w-full 
        flex 
        flex-wrap 
        justify-center 
        laptop:justify-between 
        items-center
      "
      >
        <HeaderSelector
          byPopularity={byPopularity}
          year={year}
          season={getSeasonFromParams(season)}
          setByCount={setByCount}
          setByPopularity={setByPopularity}
        />
        <div className="bg-[rgb(38,38,38)] w-[350px] sm:w-[350px] h-[40px] flex items-center justify-between gap-3 p-2">
          <p className="text-bold font-bold">
            Sorted: {byCount ? "By Countdown" : "By Popularity"}
          </p>
          <p className="text-bold font-bold">
            Season: {getSeasonFromEnum(getSeasonFromParams(season))}
          </p>
        </div>
        <div className="border-b border-[rgb(38,38,38)] w-full"></div>
      </div>
    </div>
  );
}
