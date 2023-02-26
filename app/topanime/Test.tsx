"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getTopAnimeJinkan } from "../../components/animev3/utils/jinkanData/getTopAnimeJinkan";

const Test = ({ data, pagination }: any) => {
  const [page, setPage] = useState(pagination?.current_page || 1);
  const [clientData, setClientData] = useState(data);
  useEffect(() => {
    // console.log(data);
  }, []);

  const handlePagination = async () => {
    const { data: newData = [], pagination: newPagination = {} } =
      await getTopAnimeJinkan({
        page: page + 1,
        isClient: true,
      });
    if (newData.length) {
      setClientData((prev: []) => {
        return [...prev, ...newData];
      });
      setPage((prev: any) => {
        return newPagination?.current_page || prev;
      });
    }
  };

  return (
    <div className="flex flex-col">
      {clientData?.map((anime: any, index: number) => (
        <div key={index} className="p-2 animate-grow">
          <div className="flex justify-between items-center border rounded-2xl border-[rgb(53,53,53)] laptop2:p-4 laptop2:gap-2">
            <div className="flex items-center gap-4">
              <div className="pl-2 laptop2:w-[120px]">
                <p className="text-2xl laptop2:text-8xl">{index + 1}</p>
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
            <div className="max-w-[50px] laptop2:max-w-fit ">
              <p className="laptop2:text-xl ">
                {anime?.title_english ? anime?.title_english : anime?.title}
              </p>
            </div>
            <div>
              <p className="laptop2:text-2xl font-bold">{anime?.score}</p>
            </div>
          </div>
        </div>
      ))}
      <button className="border p-2 rounded-lg" onClick={handlePagination}>
        <p>Show More</p>
      </button>
    </div>
  );
};
export { Test };
