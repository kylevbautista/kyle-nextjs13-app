import Image from "next/image";
import Link from "next/link";

const buttonBase =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";
const primaryButton = `${buttonBase} bg-blue-600 text-white hover:bg-blue-500`;
const secondaryButton = `${buttonBase} border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] text-white hover:bg-[rgb(53,53,53)]`;

export default function Hero() {
  return (
    <section
      aria-labelledby="home-title"
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pb-10 pt-12 text-center sm:pt-20"
    >
      <Image src="/rimuru.png" alt="" width={120} height={85} />
      <div className="flex flex-col items-center gap-2">
        <h1 id="home-title" className="text-5xl font-bold tracking-tight sm:text-6xl">
          kylevb
        </h1>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#95ccff]">
          seasonal anime tracker
        </p>
      </div>
      <p className="max-w-xl text-lg text-[rgb(164,164,164)] sm:text-xl">
        Track every anime airing this season — live episode countdowns, your
        list, your progress.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/anime" className={primaryButton}>
          Browse this season
        </Link>
        <Link href="/topanime" className={secondaryButton}>
          Top anime
        </Link>
        <Link href="/search" className={secondaryButton}>
          Search
        </Link>
      </div>
      <p
        aria-hidden="true"
        className="mt-6 text-sm text-[rgb(164,164,164)] motion-safe:animate-bounce"
      >
        keep scrolling ↓
      </p>
    </section>
  );
}
