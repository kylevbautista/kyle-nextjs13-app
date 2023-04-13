"use client";
import { useState, useContext } from "react";
import { HeaderContext } from "./HeaderProvider";

export function HeaderSelector() {
  const header = useContext(HeaderContext);
  const { option, setOption, season, setSeason, day, setDay } = header;
  const selected =
    "flex items-center h-[44px] border-b border-blue-500 cursor-pointer text-blue-500 font-bold hover:border-blue-500";
  const unSelected =
    "flex items-center h-[44px] border-b border-transparent cursor-pointer text-[rgb(164,164,164)] hover:border-blue-500";

  return (
    <div className="text-white flex flex-wrap flex-col items-center justify-end">
      <div className="flex justify-center items-center gap-5 basis-full sm:flex-initial">
        <button
          className={season == "winter" ? selected : unSelected}
          onClick={() => {
            setSeason("winter");
          }}
        >
          <p className="hidden sm:block">Winter</p>
          <p className="sm:hidden">Win</p>
        </button>
        <button
          className={season === "spring" ? selected : unSelected}
          onClick={() => {
            setSeason("spring");
          }}
        >
          <p className="hidden sm:block">Spring</p>
          <p className="sm:hidden">Spr</p>
        </button>
        <button
          className={season === "summer" ? selected : unSelected}
          onClick={() => {
            setSeason("summer");
          }}
        >
          <p className="hidden sm:block">Summer</p>
          <p className="sm:hidden">Sum</p>
        </button>
        <button
          className={season === "fall" ? selected : unSelected}
          onClick={() => {
            setSeason("fall");
          }}
        >
          <p className="hidden sm:block">Fall</p>
          <p className="sm:hidden">Fall</p>
        </button>
      </div>
      <div className="flex justify-center items-center gap-5 basis-full sm:flex-initial">
        <button
          className={day === "any" ? selected : unSelected}
          onClick={() => setDay("any")}
        >
          <p className="">All</p>
        </button>
        <button
          className={day === "monday" ? selected : unSelected}
          onClick={() => setDay("monday")}
        >
          <p className="hidden sm:block">Monday</p>
          <p className="sm:hidden">Mon</p>
        </button>
        <button
          className={day === "tuesday" ? selected : unSelected}
          onClick={() => setDay("tuesday")}
        >
          <p className="hidden sm:block">Tuesday</p>
          <p className="sm:hidden">Tues</p>
        </button>
        <button
          className={day === "wednesday" ? selected : unSelected}
          onClick={() => setDay("wednesday")}
        >
          <p className="hidden sm:block">Wednesday</p>
          <p className="sm:hidden">Wed</p>
        </button>
        <button
          className={day === "thursday" ? selected : unSelected}
          onClick={() => setDay("thursday")}
        >
          <p className="hidden sm:block">Thursday</p>
          <p className="sm:hidden">Thu</p>
        </button>
        <button
          className={day === "friday" ? selected : unSelected}
          onClick={() => setDay("friday")}
        >
          <p className="hidden sm:block">Friday</p>
          <p className="sm:hidden">Fri</p>
        </button>
        <button
          className={day === "saturday" ? selected : unSelected}
          onClick={() => setDay("saturday")}
        >
          <p className="hidden sm:block">Saturday</p>
          <p className="sm:hidden">Sat</p>
        </button>
        <button
          className={day === "sunday" ? selected : unSelected}
          onClick={() => setDay("sunday")}
        >
          <p className="hidden sm:block">Sunday</p>
          <p className="sm:hidden">Sun</p>
        </button>
      </div>
    </div>
  );
}
