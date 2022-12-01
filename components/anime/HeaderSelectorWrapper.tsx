"use client";

import { ReactNode, useState, useEffect, useContext } from "react";
import { HeaderContext } from "./HeaderProvider";
import HeaderSelector from "./HeaderSelector";
import { getSeasonFromEnum } from "./year/helpers";

export default function HeaderSelectorWrapper() {
  const header = useContext(HeaderContext);
  const { byCount, byPopularity, setByCount, setByPopularity } = header;
  const selectorDiv = header.headerYear
    ? "w-full flex flex-wrap justify-center laptop:justify-between items-center"
    : "invisible";

  if (!header.headerYear) {
    return null;
  }
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
      <div className={selectorDiv}>
        <HeaderSelector
          byPopularity={byPopularity}
          year={header.headerYear}
          season={header.headerSeason}
          setByCount={setByCount}
          setByPopularity={setByPopularity}
        />
        <div className="bg-[rgb(38,38,38)] w-[350px] sm:w-[350px] h-[40px] flex items-center justify-between gap-3 p-2">
          <p className="text-bold font-bold">
            Sorted: {byCount ? "By Countdown" : "By Popularity"}
          </p>
          {header.headerYear ? (
            <p className="text-bold font-bold">
              Season: {getSeasonFromEnum(header.headerSeason)}
            </p>
          ) : (
            <p className="text-bold font-bold">Season: {"Season"}</p>
          )}
        </div>
        <div className="border-b border-[rgb(38,38,38)] w-full"></div>
      </div>
    </div>
  );
}
