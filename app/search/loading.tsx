import AnimeInfoSkeleton from "@/components/animev3/AnimeInfoSkeleton";
import Grid from "@/components/common/Grid";

const SKELETON_COUNT = 8;

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex w-full flex-col items-center px-4 py-6 text-white sm:p-4"
    >
      <p role="status" className="sr-only">
        Searching AniList…
      </p>
      <div className="mb-6 flex w-full max-w-3xl gap-2" aria-hidden="true">
        <div className="h-10 flex-1 animate-pulse rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]" />
        <div className="h-10 w-[104px] animate-pulse rounded-md bg-blue-600/40" />
      </div>
      <div className="mb-4 flex w-full items-baseline justify-between gap-4" aria-hidden="true">
        <div className="h-7 w-64 max-w-[70%] animate-pulse rounded bg-[rgb(38,38,38)]" />
        <div className="h-4 w-32 animate-pulse rounded bg-[rgb(38,38,38)]" />
      </div>
      {/* inert: the skeleton cards contain placeholder links that must not be tabbable. */}
      <div className="w-full" aria-hidden="true" inert>
        <Grid>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <AnimeInfoSkeleton key={i} />
          ))}
        </Grid>
      </div>
    </main>
  );
}
