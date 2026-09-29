import AnimeInfoSkeleton from "@/components/animev3/AnimeInfoSkeleton";
import Grid from "@/components/common/Grid";

const bar = "animate-pulse rounded-full bg-[rgb(53,53,53)]";

/** Loading placeholder shaped like the Airing Schedule (header, day filters, cards). */
export default function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading airing schedule…
      </span>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className={`${bar} h-8 w-72 max-w-full`} />
        <div className={`${bar} h-4 w-56 max-w-full`} />
      </div>
      <div className="flex gap-2 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`${bar} h-8 w-16 shrink-0`} />
        ))}
      </div>
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className={`${bar} h-6 w-32`} />
        <Grid>
          {Array.from({ length: 6 }, (_, i) => (
            <AnimeInfoSkeleton key={i} />
          ))}
        </Grid>
      </div>
    </div>
  );
}
