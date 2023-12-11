import Image from "next/image";
import FixLoading from "../../components/common/FixLoading";

export default function Loading() {
  return (
    <div
      id="container"
      className="
        text-whites 
        flex 
        flex-col 
        items-center 
        justify-center
        transition-all
        sm:p-4
      "
    >
      <Image
        src="/assets/cidkagenou.gif"
        width={640}
        height={360}
        alt="I AM AOTMIC"
      />
      {/* <FixLoading /> */}
    </div>
  );
}
