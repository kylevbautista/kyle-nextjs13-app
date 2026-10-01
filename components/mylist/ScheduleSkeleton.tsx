import NightSky from "@/components/home/NightSky";
import { APP_CONTAINER, PANEL } from "@/components/theme/tokens";

const bar = "animate-pulse rounded-full bg-white/10";

/** Loading placeholder shaped like the Airing Schedule (banner, week panel, rows). */
export default function ScheduleSkeleton() {
  return (
    <div className="flex min-w-0 flex-col" aria-busy="true">
      <span className="sr-only" role="status">
        Loading airing schedule…
      </span>
      <div aria-hidden="true" className="relative isolate -mt-2 overflow-hidden [contain:inline-size]">
        <NightSky variant="page" />
        <div
          className={`${APP_CONTAINER} grid gap-8 pb-16 pt-8 sm:pb-20 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12`}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className={`h-3 w-56 max-w-full ${bar}`} />
            <div className="h-9 w-96 max-w-full animate-pulse rounded-md bg-[#0a1528]/70" />
            <div className={`mt-1 h-10 w-80 max-w-full ${bar}`} />
            <div className={`h-4 w-full max-w-xl ${bar}`} />
            <div className="mt-2 h-11 w-44 animate-pulse rounded-xl bg-white/10" />
          </div>
          <div className="hidden h-[276px] animate-pulse rounded-2xl bg-[rgb(30,30,30)]/95 sm:block lg:w-[22rem]" />
        </div>
      </div>
      <div className={`${APP_CONTAINER} grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]`} aria-hidden="true">
        <div className={`${PANEL} overflow-hidden`}>
          <div className="grid grid-cols-8 gap-1 border-b border-[rgb(53,53,53)] px-2 pb-2 pt-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="flex flex-col divide-y divide-[rgb(53,53,53)] px-4 py-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-14 w-10 shrink-0 animate-pulse rounded-md bg-[rgb(53,53,53)]" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className={`h-3.5 w-3/5 ${bar}`} />
                  <div className={`h-3 w-2/5 ${bar}`} />
                </div>
                <div className={`h-3 w-16 ${bar}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="h-40 animate-pulse rounded-2xl border border-dashed border-[#95ccff]/20" />
      </div>
    </div>
  );
}
