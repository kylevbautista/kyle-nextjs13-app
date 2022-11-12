"use client";
import { getSeasonNow } from "../../jinkan/seasonNow";
import { graphQLClient } from "../../../graphQL/graphqlClient";
import { useState, useEffect } from "react";
import allCurrentAnimeQuery from "../../../graphQL/queries/allCurrentAnimeQuery";

interface Props {
  info?: any;
  id?: any;
  children?: React.ReactNode;
}

export default function AnimeInfoGrid({ info, children, id }: Props) {
  const {
    title,
    images,
    synopsis,
    url,
    episodes,
    duration,
    aired,
    source,
    studios,
    genres,
  } = info || {};
  const { jpg, webp } = images || {};

  const getStudios = (studios: any) => {
    let studio = "";
    studios?.map((obj: any) => {
      if (studio) {
        studio += ` x ${obj.name}`;
      } else {
        studio += obj.name;
      }
    });
    return studio;
  };

  const getStartDate = (date: any) => {
    const event = new Date(date);
    const pst = event.toLocaleString();
    return pst;
  };

  const onClick = async () => {
    try {
      const data = await graphQLClient.request(allCurrentAnimeQuery);
      console.log(data);
    } catch (err) {
      console.log("error", err);
    }
  };
  return (
    <div
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
            {title}
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
                &nbsp;{obj.name} &nbsp;
              </a>
            ))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr]">
        <div className="max-w-[135px] sm:max-w-[175px] h-[201px] sm:h-[250px] sm:max-h-[250px]">
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
                sm:h-[250px]"
              src={jpg?.large_image_url}
            />
          </a>
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
            <p className="line-clamp-1">{getStudios(studios)}</p>
          </div>
          <div className="flex justify-center text-[rgb(164,164,164)] border-b pl-1 border-inherit">
            <p className="line-clamp-2">{getStartDate(aired?.from)}</p>
          </div>
          <div className="flex justify-around text-[rgb(164,164,164)] border-b pl-1 border-inherit">
            <div>
              <p className="line-clamp-2">{source}</p>
            </div>
            <div>
              <p className="line-clamp-2">
                {episodes ? episodes : "?"} eps x {duration?.slice(0, 2)}m
              </p>
            </div>
          </div>
          <div
            id={`anime-snopsis-${1}`}
            className="border-b pl-1 overflow-auto border-inherit"
          >
            <div className="">{synopsis}</div>
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
          Read more
        </a>
      </div>
    </div>
  );
}
