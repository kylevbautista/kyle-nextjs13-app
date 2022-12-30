"use client";
// import { useEffect } from "react";
import Image from "next/image";

const Test = ({ data, pagination }: any) => {
  // useEffect(() => {
  //   console.log(data);
  //   console.log(pagination);
  // }, []);

  return (
    <div>
      <ol className="pl-8">
        {data?.map((anime: any, index: number) => (
          <li key={index} className="m-8">
            <div className="flex justify-between items-center border rounded-2xl border-[rgb(53,53,53)] p-4 gap-2">
              <div className="flex items-center gap-4">
                <div className="pl-2 w-[120px]">
                  <p className="text-8xl ">{index + 1}</p>
                </div>
                <div
                  id="anime-image"
                  className="
                    w-[135px] 
                    sm:w-[175px] 
                    h-[201px] 
                    sm:h-[250px] 
                    border
                    border-[rgb(53,53,53)]
                    relative"
                >
                  <div>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://myanimelist.net/anime/${anime?.mal_id}`}
                    >
                      <Image
                        src={anime?.images?.jpg?.large_image_url}
                        fill
                        alt=""
                      />
                    </a>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xl ">
                  {anime?.title_english ? anime?.title_english : anime?.title}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{anime?.score}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
export { Test };
