import AnimeInfoSkeleton from "@/components/animev3/AnimeInfoSkeleton";
import Grid from "@/components/common/Grid";

const skeletons = () => {
  const numOfSkeletons = [];
  for (let i = 0; i < 10; i++) {
    numOfSkeletons.push(<AnimeInfoSkeleton key={i} />);
  }
  return numOfSkeletons;
};

export default function Loading() {
  return (
    <div
      id="container"
      className="
        flex 
        flex-col 
        items-center 
        justify-center 
        text-white
        transition-all
        sm:p-4
      "
    >
      <p>/mylist</p>
      <Grid>{skeletons()}</Grid>
    </div>
  );
}
