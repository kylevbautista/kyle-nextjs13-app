"use client";
import {
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";

interface Props {
  info?: any;
  id?: any;
  children?: React.ReactNode;
}

interface refProps {}

export default function CardGrid({ info, children, id }: Props) {
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
  const one = useRef<HTMLDivElement>(null);
  const two = useRef<HTMLDivElement>(null);
  const three = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLImageElement>(null);
  const [dimensions, setDimenons] = useState({ sum: 0, final: 170 });

  const getStudios = (studios: any) => {
    let studio = "";
    studios.map((obj: any) => {
      if (studio) {
        studio += ` x ${obj.name}`;
      } else {
        studio += obj.name;
      }
    });
    return studio;
  };

  //  const getGenres = (genres: any) => {
  //    let genre = "";
  //    genres.map((obj: any) => {
  //      if (genre) {
  //        genre += ` x ${obj.name}`;
  //      } else {
  //        genre += obj.name;
  //      }
  //    });
  //    return genres;
  //  };

  const getStartDate = (date: any) => {
    const event = new Date(date);
    const pst = event.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
    });
    return pst;
  };

  const onResize = useCallback(() => {
    if (one.current && two.current && three.current && ref.current) {
      let sum =
        one?.current?.["offsetHeight"] +
        two?.current?.["offsetHeight"] +
        three?.current?.["offsetHeight"];
      setDimenons({
        sum: sum,
        final: 250 - sum,
      });
      /* @ts-ignore */
      document.querySelector(`#anime-snopsis-${id}`).style.height = `${
        ref?.current?.["offsetHeight"] + 1 - sum
      }px`;
      ("99px");
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div id="anime-card" className="h-[100%]">
      {children}
      <div
        className="
        grid 
        grid-rows-[60px_201px_32px] 
        sm:grid-rows-[60px_250px_32px] 
        bg-[rgb(38,38,38)] 
        rounded-sm
        shadow-md 
        dark:bg-[rgb(30,30,30)]
        dark:border-gray-700
        h-[100%]
        "
      >
        <div
          className="
            place-items-center
            grid
            grid-rows-[1fr_auto]
            h-[60px] 
            border-b
            text-[#95ccff]
            "
        >
          <div className="line-clamp-2 leading-4 text-center">
            <a className="hover:underline" href="#">
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
              {genres.map((obj: any, index: number) => (
                <a
                  key={index}
                  className="hover:underline hover:text-[#95ccff]"
                  href="#"
                >
                  &nbsp;{obj.name} &nbsp;
                </a>
              ))}
            </p>
            {/* <a className="hover:underline hover:text-[#95ccff]" href="#">
              {getStudios(genres)} .
            </a> */}
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr]">
          <div className="max-w-[135px] sm:max-h-[250px] sm:max-w-[175px] h-[201px] sm:h-[250px]">
            <a href="#">
              <img
                ref={ref}
                className="border-[1px] object-contain max-w-[135px] sm:max-h-[250px] sm:max-w-[175px] h-[201px] sm:h-[250px]"
                src={jpg?.large_image_url}
              />
            </a>
          </div>
          <div className="grid grid-rows-[auto_auto_auto_170px]">
            <div
              ref={one}
              className="flex justify-center text-[#95ccff] border-b"
            >
              <p className="line-clamp-1">{getStudios(studios)}</p>
            </div>
            <div
              ref={two}
              className="flex justify-center text-[rgb(164,164,164)] border-b pl-1"
            >
              <p className="line-clamp-2">{getStartDate(aired.from)}</p>
            </div>
            <div
              ref={three}
              className="flex justify-around text-[rgb(164,164,164)] border-b pl-1"
            >
              <div>
                <p className="line-clamp-2">{source}</p>
              </div>
              <div>
                <p className="line-clamp-2">
                  {episodes ? episodes : "?"} eps x {duration.slice(0, 2)}m
                </p>
              </div>
            </div>
            <div
              id={`anime-snopsis-${id}`}
              className="border-b pl-1 overflow-auto"
            >
              <div className="">{synopsis}</div>
            </div>
          </div>
        </div>
        <div className="h-[32px]">
          <a
            href={url}
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
    </div>
  );
}
