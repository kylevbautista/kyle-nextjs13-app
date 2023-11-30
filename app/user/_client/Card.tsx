import { useState } from "react";
import Image from "next/image";
import { useInterval } from "@/components/animev3/utils/useInterval";
import { getInitialTimesFromTimeStamp } from "@/components/animev3/helpers";

export const Card = ({
  item,
  setShowModal,
  updateUserAnimeData,
  setModalContent,
  hydrated,
}: any) => {
  const [day, setDay] = useState<number>(
    getInitialTimesFromTimeStamp(item?.upComingAirDate?.episode[0]?.airingAt)
      ?.d || 0
  );
  const [hours, setHour] = useState<number>(
    getInitialTimesFromTimeStamp(item?.upComingAirDate?.episode[0]?.airingAt)
      ?.h || 0
  );
  const [minute, setMinute] = useState<number>(
    getInitialTimesFromTimeStamp(item?.upComingAirDate?.episode[0]?.airingAt)
      ?.m || 0
  );
  const [second, setSecond] = useState<number>(
    getInitialTimesFromTimeStamp(item?.upComingAirDate?.episode[0]?.airingAt)
      ?.s || 0
  );

  const startTimer = () => {
    if (item?.upcomingEpisode?.timeUntilAiring) {
      const unixTimeStamp = item?.upComingAirDate?.episode[0]?.airingAt;
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

  useInterval(startTimer, 1000, null);

  return (
    <div className="flex items-center justify-center gap-4 rounded-md p-2">
      <div className="flex flex-col items-center justify-center rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]">
        <div className="group relative h-[230px] w-[170px] ">
          {/* <img
                src={item?.coverImage?.extraLarge}
                alt="Avatar"
                className="h-[210px]"
              /> */}
          <Image src={item?.coverImage?.extraLarge} fill alt="" />
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
            text-xs sm:w-[173px]"
          >
            {hydrated && (
              <p>
                EP{item?.upcomingEpisode?.episode}: {day}d {hours}h {minute}m{" "}
                {second}s
              </p>
            )}
          </div>
          <div className="absolute bottom-[25px] flex h-[40px] w-full items-center justify-start bg-[rgba(0,0,0,0.6)] p-1">
            <p className="line-clamp-2 leading-4">
              {item?.title?.english || item?.title?.romaji}
            </p>
          </div>
          <div className="absolute bottom-0 flex h-[25px] w-full items-center bg-[rgba(0,0,0,0.6)] px-1">
            <p className="line-clamp-1 text-sm">
              {item?.userData?.episodeProgressNumber}/{item.episodes || "?"}
            </p>

            <button
              id="episode-increment"
              onClick={(e) => updateUserAnimeData({ info: item, e })}
              disabled={
                !Boolean(item?.episodes) ||
                (item.episodes &&
                  item.userData.episodeProgressNumber === item.episodes)
              }
              className="hidden group-hover:block"
            >
              {item.episodes &&
              item.userData.episodeProgressNumber === item.episodes ? (
                <p className="ml-1">Complete</p>
              ) : item.episodes ? (
                <p className="ml-1">+</p>
              ) : (
                <p className="ml-1">{`Can't Add`}</p>
              )}
            </button>
          </div>
          <button
            // onClick={() => removeHandler(item)}
            onClick={() => {
              setShowModal(true);
              setModalContent(item);
            }}
            className="absolute right-[-6px] top-[-6px] hidden h-[25px] w-[25px] rounded bg-blue-600 text-center hover:bg-blue-400 group-hover:block"
          >
            <div className="">
              <p className="">...</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
