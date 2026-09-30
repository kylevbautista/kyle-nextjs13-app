import { ListCardSkeleton, ListGrid } from "../_client/ListGrid";

const bar = "animate-pulse rounded-full bg-[rgb(53,53,53)]";

export default function Loading() {
  return (
    <div className="flex min-w-0 flex-col gap-6 py-4" aria-busy="true">
      <p className="sr-only" role="status">
        Loading list…
      </p>
      <div className="flex items-center gap-4 rounded-md border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-[rgb(53,53,53)]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className={`h-5 w-48 max-w-full ${bar}`} />
          <div className={`h-3 w-24 ${bar}`} />
        </div>
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex min-w-0 gap-2 overflow-hidden md:w-56 md:shrink-0 md:flex-col">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-11 w-24 shrink-0 animate-pulse rounded-md bg-[rgb(38,38,38)] md:h-9 md:w-full"
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="h-10 w-full animate-pulse rounded-md bg-[rgb(38,38,38)]" />
          <ListGrid>
            {Array.from({ length: 8 }, (_, i) => (
              <ListCardSkeleton key={i} />
            ))}
          </ListGrid>
        </div>
      </div>
    </div>
  );
}
