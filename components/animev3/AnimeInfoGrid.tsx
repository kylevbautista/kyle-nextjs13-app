"use client";
import { useState, useEffect, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
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
import addToUserAnimeListMutation from "../utils/graphql/tags/addToUserAnimeList.graphql";
import removeFromUserAnimeList from "../utils/graphql/tags/mutations/removeFromUserAnimeList.graphql";
import { fetchFromGraphQLServer } from "../utils/graphql/utils/fetchFromGraphQLServer";
import { useSWRConfig } from "swr";
import { unixTimeStampToWeekDay } from "./utils/timeStampHelpers";
import { useInterval } from "./utils/useInterval";
import toast from "react-hot-toast";

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
    return {};
  }
};

const removeFromList = async (info: any) => {
  try {
    const res = await fetchFromGraphQLServer({
      query: removeFromUserAnimeList,
      variables: {
        data: info,
      },
    });
    const { data = null } = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return {};
  }
};

interface Props {
  info?: any;
  id?: any;
  initialTimes?: any;
  option?: any;
  children?: React.ReactNode;
}

export default function AnimeInfoGrid({
  info,
  children,
  initialTimes,
  id,
  option = "Any",
}: Props) {
  const router = useRouter();
  const { cache } = useSWRConfig();
  const { mutate } = useSWRConfig();
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
  const hydrated = useContext(HydrationContext);

  const saveToAnimeList = async (info: any) => {
    const loadingToast = toast.loading("Adding To List...");
    const res = await addToUserAnimeList(info);
    const message = res.addToUserAnimeList?.message || "";

    if (message === "Successfully Added to List") {
      const addSuccess = toast.success(
        `Added ${info?.title?.romaji} to your Anime List`,
        { id: loadingToast }
      );
      setTimeout(() => {
        toast.remove(addSuccess);
      }, 2500);
    } else if (message === "Already In List") {
      const addDupe = toast.error(
        `You are already following ${
          info?.title?.english || info?.title?.romaji
        }`,
        { id: loadingToast }
      );
      setTimeout(() => {
        toast.remove(addDupe);
      }, 2500);
    } else {
      const addError = toast.error("Login To Add", { id: loadingToast });
      setTimeout(() => {
        toast.remove(addError);
      }, 2500);
    }
    const currentTime = Date.now();
    if (!localStorage.getItem("listRefreshTime")) {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    } else {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    }

    if (message === "Successfully Added to List" && cache?.get("/mylist")) {
      let placeholder = "";
      const prevData = cache?.get("/mylist")?.data;
      mutate("/mylist", placeholder, {
        populateCache: (mylist) => {
          console.log("asdf", mylist);
          return [...prevData, info];
        },
      });
    }
    // unixTimeStampToWeekDay(info?.firstEpisode?.episode[0]?.airingAt);
  };

  const removeTest = async (info: any) => {
    const loadingToast = toast.loading("Removing From List...");
    const res = await removeFromList(info);
    const message = res.removeFromUserAnimeList?.message || "";
    if (message === "Successfully Removed From List") {
      const removeSuccess = toast.success(
        `Removed ${info?.title?.romaji} from your Anime List`,
        {
          id: loadingToast,
        }
      );
      setTimeout(() => {
        toast.remove(removeSuccess);
      }, 2000);
    } else if (message === "Did Not Remove") {
      const didNotRemove = toast.error(
        `Unable To Remove ${info?.title?.romaji} from List`,
        {
          id: loadingToast,
        }
      );
      setTimeout(() => {
        toast.remove(didNotRemove);
      }, 2000);
    } else {
      const loginToRemove = toast.error("Login To Remove From List", {
        id: loadingToast,
      });
      setTimeout(() => {
        toast.remove(loginToRemove);
      }, 2000);
    }
    console.log("done");
    const currentTime = Date.now();
    if (!localStorage.getItem("listRefreshTime")) {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    } else {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    }
    // router.refresh();
    if (message === "Successfully Removed From List" && cache?.get("/mylist")) {
      let placeholder = "";
      const prevData = cache?.get("/mylist")?.data;

      for (let i = 0; i < prevData.length; i++) {
        if (prevData[i]?.idMal === info?.idMal) {
          prevData.splice(i, 1);
          break;
        }
      }
      mutate("/mylist", placeholder, {
        populateCache: (mylist) => {
          console.log("asdf", mylist);
          return [...prevData];
        },
      });
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
    externalLinks = [],
  } = info || {};
  const { english: englishTitle = null, romaji: romajiTitle = null } = title;
  const displayTitle = title
    ? englishTitle
      ? englishTitle
      : romajiTitle
    : "Title";
  let mediaLink = `https://aniwatch.to/search?keyword=${displayTitle.replace(
    / /g,
    "+"
  )}`;
  if (externalLinks?.length) {
    const crunchyRollLink = externalLinks.find(
      (obj: any) => obj.site === "Crunchyroll"
    );
    if (crunchyRollLink) {
      mediaLink = crunchyRollLink.url;
    }
  }

  const startTimer = () => {
    if (upcomingEpisode?.timeUntilAiring) {
      const unixTimeStamp = upComingAirDate?.episode[0]?.airingAt;
      const currentTimeStamp = Math.floor(Date.now() / 1000);
      let secondsLeft = unixTimeStamp - currentTimeStamp;
      if (secondsLeft < 0) {
        setDay(0);
        setHour(0);
        setMinute(0);
        setSecond(0);
      } else {
        let d = Math.floor(secondsLeft / (3600 * 24));
        let h = Math.floor((secondsLeft % (3600 * 24)) / 3600);
        let m = Math.floor((secondsLeft % 3600) / 60);
        let s = Math.floor(secondsLeft % 60);
        setDay(d);
        setHour(h);
        setMinute(m);
        setSecond(s);
      }
    }
  };

  useInterval(startTimer, 1000, option);

  return (
    <div
      id="anime-card-container"
      className="
      grid 
      animate-grow 
      grid-rows-[60px_201px_32px] 
      rounded-sm 
      border-[rgb(53,53,53)]
      bg-[rgb(38,38,38)] 
      shadow-md
      dark:bg-[rgb(30,30,30)]
      sm:grid-rows-[60px_250px_32px]
      "
    >
      <div
        className="
          grid
          h-[60px]
          grid-rows-[38px_22px]
          place-items-center 
          border-b
          border-inherit
          text-[#95ccff]
          "
      >
        <div className="flex h-full w-full items-center justify-center text-center">
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold leading-4 hover:underline"
            href={`https://myanimelist.net/anime/${idMal}`}
          >
            <p className="line-clamp-2">{displayTitle}</p>
          </a>
        </div>
        <div
          className="
            text-xs
            leading-6
            text-[rgb(164,164,164)]
            line-clamp-1
          "
        >
          <p>
            {genres
              ? genres.map((obj: any, index: number) => (
                  <a
                    key={index}
                    className="hover:text-[#95ccff] hover:underline"
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
            relative 
            h-[201px] 
            w-[135px] 
            border-b 
            border-l
            border-r
            border-[rgb(53,53,53)]
            sm:h-[250px]
            sm:w-[175px]"
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
            absolute
            top-[0px] 
            flex 
            h-[24px] 
            w-[133px] 
            items-center 
            justify-center 
            bg-[rgba(0,0,0,0.6)] 
            text-xs 
            sm:w-[173px]"
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
            absolute
            bottom-[8px] 
            left-[8px] 
            flex 
            h-[25px]
            w-[65px]
            items-center 
            justify-center 
            rounded-[35px] 
            bg-[rgba(0,0,0,0.6)]
            p-1 
            text-xs"
          >
            <div className="star"></div>
            <p>{averageScore ? (averageScore / 10).toFixed(1) : "N/A"}</p>
          </div>
        </div>
        <div
          className="
          grid 
          grid-rows-[25px_25px_25px_126px] 
          border-[rgb(53,53,53)] 
          sm:grid-rows-[25px_48px_48px_129px] 
          tablet:grid-rows-[27px_27px_27px_169px]
        "
        >
          <div className="flex justify-center border-b border-inherit text-[#95ccff]">
            <p className="line-clamp-1">
              {studios ? getStudios(studios.nodes) : "Studio"}
            </p>
          </div>
          <div className="flex items-center justify-center border-b border-inherit pl-1 text-[rgb(164,164,164)]">
            <p className="text-sm line-clamp-2">
              {unixTimeStampToDate(firstEpisode?.episode[0]?.airingAt)}
            </p>
          </div>
          <div className="flex items-center justify-around gap-[6px] border-b border-inherit pl-1 text-sm text-[rgb(164,164,164)]">
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
            className="scrollbar border-b border-inherit pl-1 pr-1"
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
        className="flex h-[32px] flex-wrap items-center justify-center gap-2 overflow-auto"
      >
        {/* <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="eye"
          ></a>
        </div> */}
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="mal"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={mediaLink}
            className="crunchyroll"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://aniwatch.to/search?keyword=${displayTitle.replace(
              / /g,
              "+"
            )}`}
            className="adb"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="fox"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="globe"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="planet"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="twitter"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://myanimelist.net/anime/${idMal}`}
            className="cut"
          ></a>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
          <button
            // target="_blank"
            // rel="noopener noreferrer"
            // href={`https://myanimelist.net/anime/${idMal}`}
            className="anilist"
            onClick={() => removeTest(info)}
          ></button>
        </div>
        <div className="rounded-[50%] hover:bg-blue-500">
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
