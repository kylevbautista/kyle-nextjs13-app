import Image from "next/image";
import AnimeInfoSkeleton from "../../../components/anime/year/AnimeInfoSkeleton";
import Grid from "../../../components/common/Grid";

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
    </div>
  );
}
