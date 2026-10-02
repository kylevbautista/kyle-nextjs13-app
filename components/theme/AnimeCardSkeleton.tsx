import Slime from "@/components/home/Slime";

const BAR = "rounded bg-[rgb(53,53,53)]";

/**
 * AnimeCard's placeholder, with the card's exact box model (same body
 * padding and line boxes), so swapping it for a real card shifts nothing.
 * The season grid's lazy-load sentinel, /search's loading grid and the Quest
 * Log's placeholders. Hook-free and aria-hidden.
 */
export default function AnimeCardSkeleton({ variant = "full" }: { variant?: "full" | "compact" }) {
  const compact = variant === "compact";
  return (
    <div
      aria-hidden="true"
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]"
    >
      <div className="relative aspect-[2/3] w-full animate-pulse bg-[rgb(38,38,38)]">
        <Slime size={40} animated={false} className="absolute inset-0 m-auto opacity-25" />
      </div>
      <div className={`flex flex-1 animate-pulse flex-col ${compact ? "p-2" : "p-2.5 sm:p-3"}`}>
        <div className={`flex flex-col justify-center ${compact ? "h-8 gap-1" : "h-10 gap-1.5"}`}>
          <span className={`w-11/12 ${compact ? "h-3" : "h-3.5"} ${BAR}`} />
          <span className={`w-2/3 ${compact ? "h-3" : "h-3.5"} ${BAR}`} />
        </div>
        {!compact && (
          <>
            <span className={`mt-1 block h-4 w-2/3 ${BAR}`} />
            <span className={`mt-0.5 block h-4 w-1/2 ${BAR}`} />
          </>
        )}
        <div className="mt-auto pt-2">
          <span className="block h-11 w-full rounded-lg bg-[rgb(53,53,53)] md:h-9" />
        </div>
      </div>
    </div>
  );
}
