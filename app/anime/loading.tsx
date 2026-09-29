import AnimeInfoSkeleton from "@/components/animev3/AnimeInfoSkeleton";
import Grid from "@/components/common/Grid";

const SKELETON_KEYS = Array.from({ length: 12 }, (_, i) => i);

export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center text-white sm:p-4"
      role="status"
      aria-label="Loading anime"
    >
      <Grid>
        {SKELETON_KEYS.map((key) => (
          <AnimeInfoSkeleton key={key} />
        ))}
      </Grid>
    </div>
  );
}
