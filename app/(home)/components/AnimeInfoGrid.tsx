"use client";
import { getSeasonNow } from "../../jinkan/seasonNow";
import { useState, useEffect, ReactNode } from "react";
import { getStudios, unixTimeStampToDate, startTimer } from "./helpers";

interface Props {
  info?: any;
  id?: any;
  children?: React.ReactNode;
}

export default function AnimeInfoGrid({ info, children, id }: Props) {
  const [day, setDay] = useState<number>(0);
  const [hours, setHour] = useState<number>(0);
  const [minute, setMinute] = useState<number>(0);
  const [second, setSecond] = useState<number>(0);
  let interval: any;

  const {
    title,
    coverImage,
    genres,
    studios,
    idMal,
    startDate,
    status,
    episodes,
    duration,
    upcomingEpisode,
    firstEpisode,
    source,
    description,
  } = info || {};

  useEffect(() => {
    if (upcomingEpisode?.timeUntilAiring) {
      startTimer(
        interval,
        upcomingEpisode?.timeUntilAiring,
        setDay,
        setHour,
        setMinute,
        setSecond
      );
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="anime-card-container"
      className="
      grid 
      grid-rows-[60px_201px_32px] 
      sm:grid-rows-[60px_250px_32px] 
      bg-[rgb(38,38,38)] 
      rounded-sm
      shadow-md 
      dark:bg-[rgb(30,30,30)]
      border-[rgb(53,53,53)]
      h-[100%]
      "
    >
      <div
        className="
          place-items-center
          grid
          grid-rows-[38px_22px]
          h-[60px] 
          border-b
          border-inherit
          text-[#95ccff]
          "
      >
        <div className="w-full h-full flex justify-center items-center">
          <a className="line-clamp-2 leading-4 hover:underline" href="#">
            {title.romaji}
          </a>
        </div>
        <div
          className="
            line-clamp-1
            text-sm
            text-[rgb(164,164,164)]
            leading-6
          "
        >
          <p>
            {genres?.map((obj: any, index: number) => (
              <a
                key={index}
                className="hover:underline hover:text-[#95ccff]"
                href="#"
              >
                &nbsp;{obj} &nbsp;
              </a>
            ))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr]">
        <div
          id="anime-image"
          className="max-w-[135px] sm:max-w-[175px] h-[201px] sm:h-[250px] sm:max-h-[250px] relative"
        >
          <div className="">
            <a href="#">
              <img
                className="
                border 
                border-[rgb(53,53,53)] 
                object-contain 
                max-w-[135px] 
                sm:max-h-[250px] 
                sm:max-w-[175px] 
                h-[201px] 
                sm:h-[250px]
              "
                src={coverImage?.extraLarge}
              />
            </a>
          </div>
          <div
            id="countDown"
            className="
            bg-gray-900/70 
            absolute 
            w-[135px] 
            sm:w-[175px] 
            h-[24px] 
            top-[1px] 
            text-xs 
            flex 
            justify-center 
            items-center"
          >
            <p>
              EP{upcomingEpisode?.episode}: {day}d {hours}h {minute}m {second}s
            </p>
          </div>
        </div>
        <div
          className="
          grid 
          grid-rows-[25px_25px_25px_126px] 
          sm:grid-rows-[25px_48px_48px_129px] 
          tablet:grid-rows-[27px_27px_27px_169px] 
          border-[rgb(53,53,53)]
        "
        >
          <div className="flex justify-center text-[#95ccff] border-b border-inherit">
            <p className="line-clamp-1">{getStudios(studios.nodes)}</p>
          </div>
          <div className="flex justify-center text-[rgb(164,164,164)] border-b pl-1 border-inherit">
            <p className="line-clamp-2">
              {unixTimeStampToDate(firstEpisode?.episode[0]?.airingAt)}
            </p>
          </div>
          <div className="flex justify-around text-[rgb(164,164,164)] border-b pl-1 border-inherit">
            <div>
              <p className="line-clamp-2">{source.replaceAll("_", " ")}</p>
            </div>
            <div>
              <p className="line-clamp-2">
                {episodes ? episodes : "?"} eps x {duration ? duration : "?"}m
              </p>
            </div>
          </div>
          <div
            id={`anime-snopsis-${1}`}
            className="border-b pl-1 overflow-auto border-inherit"
          >
            {description ? (
              <div
                className=""
                dangerouslySetInnerHTML={{ __html: description }}
              ></div>
            ) : (
              <div>No synopsis has been added to this title.</div>
            )}
          </div>
        </div>
      </div>

      <div className="h-[32px]">
        <a
          // href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="
              bg-blue-700
              hover:shadow-md 
              hover:shadow-white
              rounded-md
            "
        >
          Read more:
        </a>
      </div>
    </div>
  );
}
