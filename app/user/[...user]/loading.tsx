import NightSky from "@/components/home/NightSky";
import { APP_CONTAINER, PANEL } from "@/components/theme/tokens";
import { ListCardSkeleton, ListGrid } from "../_client/ListGrid";

const bar = "animate-pulse rounded-full bg-white/10";

/** Shaped like MyList: the night-sky banner, the shelves console, then cards. */
export default function Loading() {
  return (
    <div className="min-w-0 pb-8" aria-busy="true">
      <p className="sr-only" role="status">
        Loading list…
      </p>
      <div aria-hidden="true" className="relative isolate -mt-2 overflow-hidden [contain:inline-size]">
        <NightSky variant="page" />
        <div
          className={`${APP_CONTAINER} grid gap-8 pb-16 pt-8 sm:pb-20 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12`}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className={`h-3 w-40 ${bar}`} />
            <div className="h-9 w-80 max-w-full animate-pulse rounded-md bg-[#0a1528]/70" />
            <div className={`mt-1 h-10 w-72 max-w-full ${bar}`} />
            <div className={`h-4 w-full max-w-xl ${bar}`} />
            <div className="mt-2 flex gap-3">
              <div className="h-11 w-48 animate-pulse rounded-xl bg-white/10" />
              <div className="h-11 w-28 animate-pulse rounded-xl bg-white/10" />
            </div>
            <div className="mt-2 h-[74px] w-full max-w-2xl animate-pulse rounded-xl bg-[#0a1428]/80" />
          </div>
          <div className="h-[96px] animate-pulse rounded-2xl bg-[#0a1428]/80 lg:h-[300px] lg:w-[20rem]" />
        </div>
      </div>
      <div className={`${APP_CONTAINER} flex flex-col gap-8`} aria-hidden="true">
        <div className={`${PANEL} flex flex-col gap-3 p-3 sm:p-4`}>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-11 w-24 animate-pulse rounded-full bg-white/5 md:h-9" />
            ))}
          </div>
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/5 md:h-10" />
        </div>
        <div className="flex flex-col gap-4">
          <div className={`h-5 w-32 ${bar}`} />
          <ListGrid>
            {Array.from({ length: 8 }, (_, i) => (
              <ListCardSkeleton key={i} />
            ))}
          </ListGrid>
        </div>
      </div>
    </div>
  );
}
