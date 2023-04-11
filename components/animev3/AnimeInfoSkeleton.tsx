interface Props {
  forwardedRef?: any;
}

export default function AnimeInfoSkeleton({ forwardedRef }: Props) {
  return (
    <div
      ref={forwardedRef}
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
      animate-pulse
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
          <a
            className="animate-pulse flex w-[70%] h-4 bg-gray-200 rounded-full dark:bg-gray-700"
            href="#"
          >
            {/* skeleton... */}
          </a>
        </div>
        <div
          className="
            w-full h-full flex justify-center items-center
          "
        >
          <p className="animate-pulse flex w-[60%] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
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
          <div className="h-full flex justify-center items-center">
            <a href="#">
              <svg
                className="w-[90%] h-12 text-gray-200"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                fill="currentColor"
                viewBox="0 0 640 512"
              >
                <path d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z" />
              </svg>
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
            <p className="animate-pulse flex w-[60%] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
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
            <p className="animate-pulse flex w-[60%] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
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
          <div className="flex justify-center items-center text-[#95ccff] border-b border-inherit">
            <p className="animate-pulse flex w-[94px] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
          </div>
          <div className="flex justify-center items-center text-[rgb(164,164,164)] border-b pl-1 border-inherit">
            <p className="animate-pulse flex w-[90%] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
          </div>
          <div className="flex justify-around items-center gap-[6px] text-[rgb(164,164,164)] border-b pl-1 border-inherit text-sm">
            <div className="p-[2px]">
              <p className="animate-pulse flex w-[50px] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
            </div>
            <div>
              <p className="animate-pulse flex w-[84px] sm:w-[60px] h-2.5 bg-gray-200 rounded-full dark:bg-gray-700"></p>
            </div>
          </div>
          <div
            id={`anime-snopsis-${1}`}
            className="border-b pl-1 overflow-auto border-inherit"
          >
            <div className="mt-2 pr-2 w-[100%] animate-pulse">
              <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-[100%] mb-4"></div>
              <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-[100%] mb-2.5"></div>
              <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
              <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-[90%] mb-2.5"></div>
              <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-[80%] mb-2.5"></div>
              <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-[85%]"></div>
            </div>
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
            href={`#`}
            className="eye"
          ></a>
        </div> */}
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="mal"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="crunchyroll"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="adb"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="fox"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="globe"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="planet"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="twitter"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="cut"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="anilist"
          ></a>
        </div>
        <div className="hover:bg-blue-500 rounded-[50%]">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`#`}
            className="anisearch"
          ></a>
        </div>
      </div>
    </div>
  );
}
