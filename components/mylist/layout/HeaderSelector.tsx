"use client";
import { useState, useContext } from "react";
import { HeaderContext } from "./HeaderProvider";

export function HeaderSelector() {
  const header = useContext(HeaderContext);
  const { option, setOption } = header;
  const selected =
    "flex items-center h-[44px] border-b border-blue-500 cursor-pointer text-blue-500 font-bold hover:border-blue-500";
  const unSelected =
    "flex items-center h-[44px] border-b border-transparent cursor-pointer text-[rgb(164,164,164)] hover:border-blue-500";

  return (
    <div className="text-white flex flex-wrap justify-center items-end gap-5">
      <div className="flex justify-center items-center gap-5 basis-full sm:flex-initial">
        <button
          className={option === "Any" ? selected : unSelected}
          onClick={() => setOption("Any")}
        >
          <p className="">All</p>
        </button>
        <button
          className={option === "Monday" ? selected : unSelected}
          onClick={() => setOption("Monday")}
        >
          <p className="hidden sm:block">Monday</p>
          <p className="sm:hidden">Mon</p>
        </button>
        <button
          className={option === "Tuesday" ? selected : unSelected}
          onClick={() => setOption("Tuesday")}
        >
          <p className="hidden sm:block">Tuesday</p>
          <p className="sm:hidden">Tues</p>
        </button>
        <button
          className={option === "Wednesday" ? selected : unSelected}
          onClick={() => setOption("Wednesday")}
        >
          <p className="hidden sm:block">Wednesday</p>
          <p className="sm:hidden">Wed</p>
        </button>
        <button
          className={option === "Thursday" ? selected : unSelected}
          onClick={() => setOption("Thursday")}
        >
          <p className="hidden sm:block">Thursday</p>
          <p className="sm:hidden">Thu</p>
        </button>
        <button
          className={option === "Friday" ? selected : unSelected}
          onClick={() => setOption("Friday")}
        >
          <p className="hidden sm:block">Friday</p>
          <p className="sm:hidden">Fri</p>
        </button>
        <button
          className={option === "Saturday" ? selected : unSelected}
          onClick={() => setOption("Saturday")}
        >
          <p className="hidden sm:block">Saturday</p>
          <p className="sm:hidden">Sat</p>
        </button>
        <button
          className={option === "Sunday" ? selected : unSelected}
          onClick={() => setOption("Sunday")}
        >
          <p className="hidden sm:block">Sunday</p>
          <p className="sm:hidden">Sun</p>
        </button>
      </div>
    </div>
  );
}
