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
      {/* <div className="text-white flex justify-center items-center gap-3 basis-full sm:flex-initial">
        <button
          id="season-back"
          className="hover:bg-[rgb(53,53,53)] rounded-[50%] fill-[rgb(149,204,255)] cursor-pointer"
          onClick={onClickHandler}
          disabled={!year ? true : false}
          value={`${season} ${year}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="34px"
            height="34px"
          >
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
          </svg>
        </button>
        <div className="flex flex-col">
          <div>
            {year ? (
              <p
                className="
            text-xs
            text-[rgb(164,164,164)]
            "
              >
                {displaySeasonText[season]?.from} {year}-
                {displaySeasonText[season]?.to} {year}
              </p>
            ) : (
              <p
                className="
            text-xs
            text-[rgb(164,164,164)]
            "
              >
                {"Month"} {"Year"}-{"Month"} {"Year"}
              </p>
            )}
          </div>
          <div
            className="
        "
          >
            {year ? (
              <h1 className="text-4xl">
                {getSeasonFromEnum(season)} {year} Anime
              </h1>
            ) : (
              <h1 className="text-4xl">
                {"Season"} {"Year"} Anime
              </h1>
            )}
          </div>
        </div>
        <button
          id="season-forward"
          className="hover:bg-[rgb(53,53,53)] rounded-[50%] fill-[rgb(149,204,255)] cursor-pointer"
          onClick={onClickHandler}
          disabled={!year ? true : false}
          value={`${season} ${year}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="33px"
            height="33px"
          >
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
          </svg>
        </button>
      </div> */}
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
          <p className="">Monday</p>
        </button>
        <button
          className={option === "Tuesday" ? selected : unSelected}
          onClick={() => setOption("Tuesday")}
        >
          <p className="">Tuesday</p>
        </button>
        <button
          className={option === "Wednesday" ? selected : unSelected}
          onClick={() => setOption("Wednesday")}
        >
          <p className="">Wednesday</p>
        </button>
        <button
          className={option === "Thursday" ? selected : unSelected}
          onClick={() => setOption("Thursday")}
        >
          <p className="">Thursday</p>
        </button>
        <button
          className={option === "Friday" ? selected : unSelected}
          onClick={() => setOption("Friday")}
        >
          <p className="">Friday</p>
        </button>
        <button
          className={option === "Saturday" ? selected : unSelected}
          onClick={() => setOption("Saturday")}
        >
          <p className="">Saturday</p>
        </button>
        <button
          className={option === "Sunday" ? selected : unSelected}
          onClick={() => setOption("Sunday")}
        >
          <p className="">Sunday</p>
        </button>
      </div>
    </div>
  );
}
