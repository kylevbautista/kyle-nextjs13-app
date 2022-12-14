import Image from "next/image";
import FixLoading from "../../../components/common/FixLoading";

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
        text-whites
        transition-all
      "
    >
      <Image
        src="/assets/cidkagenou.gif"
        width={640}
        height={360}
        alt="I AM AOTMIC"
      />
      <FixLoading />
    </div>
  );
}
