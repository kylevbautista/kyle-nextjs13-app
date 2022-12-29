"use client";
import { useState, useEffect, useContext } from "react";
import { HydrationContext } from "../common/HydrationProvider";
import {
  getStudios,
  unixTimeStampToDate,
  startTimerFromTimeStamp,
  getInitialTimesFromTimeStamp,
  formatSource,
} from "./helpers";
import Luffy from "/public/assets/Monkey_D_Luffy.png";
import Image from "next/image";
import { print as stringifyTag } from "graphql";
import addToUserAnimeListMutation from "../../graphql/tags/addToUserAnimeList.graphql";

const addToUserAnimeList = async (info: any) => {
  try {
    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: stringifyTag(addToUserAnimeListMutation),
        variables: {
          data: info,
        },
      }),
    });
    const { data = null } = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

interface Props {
  info?: any;
  id?: any;
  initialTimes?: any;
  children?: React.ReactNode;
}

export default function AnimeInfoGrid({
  info,
  children,
  initialTimes,
  id,
}: Props) {
  const [day, setDay] = useState<number>(
    getInitialTimesFromTimeStamp(info?.upComingAirDate?.episode[0]?.airingAt)
      ?.d || 0
  );
  const [hours, setHour] = useState<number>(
    getInitialTimesFromTimeStamp(info?.upComingAirDate?.episode[0]?.airingAt)
      ?.h || 0
  );
  const [minute, setMinute] = useState<number>(
    getInitialTimesFromTimeStamp(info?.upComingAirDate?.episode[0]?.airingAt)
      ?.m || 0
  );
  const [second, setSecond] = useState<number>(
    getInitialTimesFromTimeStamp(info?.upComingAirDate?.episode[0]?.airingAt)
      ?.s || 0
  );
  const [isHydrated, setIsHydrated] = useState<Boolean>(false);
  const hydrated = useContext(HydrationContext);
  let interval: any;

  const saveToAnimeList = async (info: any) => {
    const res = await addToUserAnimeList(info);
    const message = res.addToUserAnimeList.message || "";
    if (message === "Successfully Added to List")
      alert(`Added ${info?.title?.romaji} to your Anime List`);
    else if (message === "Already In List") {
      alert(`You are already following ${info?.title?.romaji}`);
    } else {
      alert("UnAuthorized");
    }
  };

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
    upComingAirDate,
    firstEpisode,
    source,
    description,
    averageScore,
  } = info || {};

  useEffect(() => {
    if (upcomingEpisode?.timeUntilAiring) {
      startTimerFromTimeStamp(
        interval,
        upComingAirDate?.episode[0]?.airingAt,
        setDay,
        setHour,
        setMinute,
        setSecond,
        info
      );
    }

    return () => {
      clearInterval(interval);
    };
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
        <div className="w-full h-full flex justify-center items-center text-center">
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="leading-4 hover:underline font-bold"
            href={`https://myanimelist.net/anime/${idMal}`}
          >
            <p className="line-clamp-2">{title ? title.romaji : "Title"}</p>
          </a>
        </div>
        <div
          className="
            line-clamp-1
            text-xs
            text-[rgb(164,164,164)]
            leading-6
          "
        >
          <p>
            {genres
              ? genres.map((obj: any, index: number) => (
                  <a
                    key={index}
                    className="hover:underline hover:text-[#95ccff]"
                    href="#"
                  >
                    &nbsp;{obj} &nbsp;
                  </a>
                ))
              : "genre"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr]">
        <div
          id="anime-image"
          className="
            w-[135px] 
            sm:w-[175px] 
            h-[201px] 
            sm:h-[250px] 
            border-b
            border-l
            border-r
            border-[rgb(53,53,53)]
            relative"
        >
          <div>
            <a href="#">
              <Image
                src={coverImage ? coverImage?.extraLarge : Luffy}
                fill
                alt=""
              />
            </a>
          </div>
          <div
            id="countDown"
            className="
            bg-[rgba(0,0,0,0.6)]
            absolute 
            w-[133px] 
            sm:w-[173px] 
            h-[24px] 
            top-[0px] 
            text-xs 
            flex 
            justify-center 
            items-center"
          >
            {hydrated && (
              <p>
                EP{upcomingEpisode?.episode}: {day}d {hours}h {minute}m {second}
                s
              </p>
            )}
          </div>
          {/** top-left top-right bottom-right bottom-left */}
          <div
            id="score"
            className="
            bg-[rgba(0,0,0,0.6)]
            absolute 
            w-[65px] 
            h-[25px] 
            left-[8px]
            rounded-[35px]
            bottom-[8px] 
            text-xs 
            flex 
            justify-center
            p-1 
            items-center"
          >
            <div className="star"></div>
            <p>{averageScore ? (averageScore / 10).toFixed(1) : "N/A"}</p>
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
            <p className="line-clamp-1">
              {studios ? getStudios(studios.nodes) : "Studio"}
            </p>
          </div>
          <div className="flex justify-center items-center text-[rgb(164,164,164)] border-b pl-1 border-inherit">
            <p className="line-clamp-2 text-sm">
              {unixTimeStampToDate(firstEpisode?.episode[0]?.airingAt)}
            </p>
          </div>
          <div className="flex justify-around items-center gap-[6px] text-[rgb(164,164,164)] border-b pl-1 border-inherit text-sm">
            <div className="p-[2px]">
              <p className="line-clamp-2">
                {source ? formatSource(source) : "Source"}
              </p>
            </div>
            <div>
              <p className="line-clamp-2">
                {episodes ? episodes : "?"} eps x {duration ? duration : "?"}m
              </p>
            </div>
          </div>
          <div
            id={`anime-snopsis-${1}`}
            onTouchStart={() => {}}
            className="scrollbar border-b pl-1 pr-1 border-inherit"
          >
            {description ? (
              <div className="text-xs">
                {hydrated ? (
                  <p
                    className="leading-5"
                    dangerouslySetInnerHTML={{ __html: description }}
                  ></p>
                ) : (
                  <p className="leading-5">{description}</p>
                )}
              </div>
            ) : (
              <div className="text-xs">
                No synopsis has been added to this title.
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        id="anime-links"
        className="h-[32px] flex flex-wrap justify-center items-center gap-2 overflow-auto"
      >
        {/* <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="eye"
          ></a>
        </div> */}
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="mal"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="crunchyroll"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="adb"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="fox"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="globe"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="planet"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="twitter"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="cut"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="anilist"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <button
            // target="_blank"
            // rel="noopener noreferrer"
            // href={`https://myanimelist.net/anime/${idMal}`}
            className="anisearch"
            onClick={() => saveToAnimeList(info)}
          ></button>
        </div>
      </div>
    </div>
  );
}