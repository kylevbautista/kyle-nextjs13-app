import type { Ref } from "react";

interface AnimeInfoSkeletonProps {
  /** Lets the season grid use the skeleton as its lazy-load sentinel. */
  forwardedRef?: Ref<HTMLDivElement>;
}

const BAR = "rounded-full bg-gray-700";

/** Placeholder with the same footprint as AnimeInfoGrid. */
export default function AnimeInfoSkeleton({ forwardedRef }: AnimeInfoSkeletonProps) {
  return (
    <div
      ref={forwardedRef}
      aria-hidden="true"
      className="grid animate-pulse grid-rows-[60px_201px_32px] rounded-sm border-[rgb(53,53,53)] bg-[rgb(38,38,38)] shadow-md dark:bg-[rgb(30,30,30)] sm:grid-rows-[60px_250px_32px]"
    >
      <div className="grid h-[60px] grid-rows-[38px_22px] place-items-center border-b border-inherit">
        <div className="flex h-full w-full items-center justify-center">
          <div className={`h-4 w-[70%] ${BAR}`}></div>
        </div>
        <div className="flex h-full w-full items-center justify-center">
          <div className={`h-2.5 w-[60%] ${BAR}`}></div>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr]">
        <div className="relative h-[201px] w-[135px] border-b border-l border-r border-[rgb(53,53,53)] sm:h-[250px] sm:w-[175px]">
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-12 w-[90%] text-gray-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 640 512"
            >
              <path d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z" />
            </svg>
          </div>
          <div className="absolute inset-x-0 top-0 flex h-[24px] items-center justify-center bg-[rgba(0,0,0,0.6)]">
            <div className={`h-2.5 w-[60%] ${BAR}`}></div>
          </div>
          <div className="absolute bottom-[8px] left-[8px] flex h-[25px] w-[65px] items-center justify-center gap-1 rounded-[35px] bg-[rgba(0,0,0,0.6)] p-1">
            <div className="star"></div>
            <div className={`h-2.5 w-[50%] ${BAR}`}></div>
          </div>
        </div>

        <div className="grid grid-rows-[25px_25px_25px_126px] border-[rgb(53,53,53)] sm:grid-rows-[25px_48px_48px_129px] tablet:grid-rows-[27px_27px_27px_169px]">
          <div className="flex items-center justify-center border-b border-inherit">
            <div className={`h-2.5 w-[94px] ${BAR}`}></div>
          </div>
          <div className="flex items-center justify-center border-b border-inherit pl-1">
            <div className={`h-2.5 w-[90%] ${BAR}`}></div>
          </div>
          <div className="flex items-center justify-around gap-[6px] border-b border-inherit pl-1">
            <div className={`h-2.5 w-[50px] ${BAR}`}></div>
            <div className={`h-2.5 w-[60px] ${BAR}`}></div>
          </div>
          <div className="overflow-hidden border-b border-inherit pl-1 pr-2 pt-2">
            <div className={`mb-4 h-2.5 w-full ${BAR}`}></div>
            <div className={`mb-2.5 h-2 w-full ${BAR}`}></div>
            <div className={`mb-2.5 h-2 w-full ${BAR}`}></div>
            <div className={`mb-2.5 h-2 w-[90%] ${BAR}`}></div>
            <div className={`mb-2.5 h-2 w-[80%] ${BAR}`}></div>
            <div className={`h-2 w-[85%] ${BAR}`}></div>
          </div>
        </div>
      </div>

      <div className="flex h-[32px] items-center justify-between gap-2 px-2">
        <div className={`h-[24px] w-[108px] ${BAR}`}></div>
        <div className="flex items-center gap-2">
          <div className="h-[26px] w-[26px] rounded-full bg-gray-700"></div>
          <div className="h-[26px] w-[26px] rounded-full bg-gray-700"></div>
          <div className="h-[26px] w-[26px] rounded-full bg-gray-700"></div>
        </div>
      </div>
    </div>
  );
}
