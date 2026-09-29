import TopAnimeShell from "./TopAnimeShell";

const SKELETON_ROWS = 6;
const bar = "rounded-full bg-[rgb(53,53,53)]";

function TopAnimeRowSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-2 sm:gap-4 sm:p-3 laptop2:p-4">
      <div className="flex min-w-[2.75rem] shrink-0 justify-center sm:min-w-[4rem] laptop2:min-w-[6rem]">
        <div className={`h-6 w-6 sm:h-8 sm:w-10 laptop2:h-12 laptop2:w-14 ${bar}`} />
      </div>
      <div className="aspect-[225/318] w-16 shrink-0 rounded-lg bg-[rgb(38,38,38)] sm:w-20 laptop2:w-24" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={`h-4 w-3/4 sm:h-5 ${bar}`} />
        <div className={`h-3 w-1/2 ${bar}`} />
        <div className={`h-3 w-1/3 ${bar}`} />
      </div>
    </li>
  );
}

export default function Loading() {
  return (
    <TopAnimeShell>
      <div role="status">
        <span className="sr-only">Loading the top anime ranking…</span>
        <ul aria-hidden="true" className="flex flex-col gap-3 animate-pulse motion-reduce:animate-none">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <TopAnimeRowSkeleton key={i} />
          ))}
        </ul>
      </div>
    </TopAnimeShell>
  );
}
