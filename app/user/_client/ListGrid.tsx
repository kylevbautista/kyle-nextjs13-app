/**
 * Layout pieces shared by the My List page and its loading state (no hooks,
 * so server components can render them too).
 *
 * The grid sizes columns by the space next to the sidebar rather than by
 * viewport breakpoints, so cards never get squeezed on md screens.
 */
export function ListGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul
      role="list"
      className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3"
    >
      {children}
    </ul>
  );
}

const bar = "animate-pulse rounded-full bg-[rgb(53,53,53)]";

export function ListCardSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="flex min-w-0 overflow-hidden rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]"
    >
      <div className="min-h-[150px] w-20 shrink-0 animate-pulse bg-[rgb(38,38,38)] md:w-[96px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <div className={`h-3.5 w-4/5 ${bar}`} />
        <div className={`h-3 w-1/2 ${bar}`} />
        <div className={`mt-auto h-1 w-full ${bar}`} />
        <div className="flex gap-2">
          <div className={`h-11 w-14 md:h-8 ${bar}`} />
          <div className={`h-11 w-14 md:h-8 ${bar}`} />
        </div>
      </div>
    </li>
  );
}
