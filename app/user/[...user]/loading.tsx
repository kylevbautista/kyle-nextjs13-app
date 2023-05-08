import AnimeInfoSkeleton from "../../../components/animev3/AnimeInfoSkeleton";
import Grid from "../../../components/common/Grid";
import FixLoading from "../../../components/common/FixLoading";

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
        justify-center 
        items-center 
        sm:p-4
        text-white
        transition-all
      "
    >
      <Grid>{skeletons()}</Grid>
      <FixLoading />
    </div>
  );
}
