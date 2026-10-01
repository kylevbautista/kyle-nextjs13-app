/**
 * Layout pieces shared by the My List page and its loading state (no hooks,
 * so server components can render them too).
 *
 * Columns are sized by the space available rather than by viewport
 * breakpoints, so cards never get squeezed.
 */
export function ListGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul
      role="list"
      className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3 sm:gap-4"
    >
      {children}
    </ul>
  );
}

const bar = "animate-pulse rounded-full bg-[rgb(53,53,53)]";

/** Same box as ListCard: 72px cover, title, badge, +1, progress, date line. */
export function ListCardSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-4"
    >
      <div className="h-[104px] w-[72px] animate-pulse rounded-md bg-[rgb(38,38,38)]" />
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className={`h-3.5 w-4/5 ${bar}`} />
            <div className={`h-4 w-16 ${bar}`} />
          </div>
          <div className="h-11 w-16 shrink-0 animate-pulse rounded-lg bg-white/10 md:h-10" />
        </div>
        <div className={`h-3 w-1/2 ${bar}`} />
        <div className={`h-1.5 w-full ${bar}`} />
        <div className={`mt-auto h-3 w-2/3 ${bar}`} />
      </div>
    </li>
  );
}
