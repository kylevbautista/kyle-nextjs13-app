import Image from "next/image";

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
      <div className="absolute left-0 top-10">
        <p>Loading...</p>
      </div>
      <div className="absolute right-0 top-10">
        <p>Loading...</p>
      </div>
      <div className="">
        <p>Loading...</p>
      </div>
      <Image
        src="/assets/cidkagenou.gif"
        width={640}
        height={360}
        alt="I AM AOTMIC"
      />
    </div>
  );
}
