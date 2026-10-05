import { MagicCircle } from "@/components/home/NightSky";
import { PauseParentWhenOffscreen } from "@/components/home/Reveal";
import Slime from "@/components/home/Slime";
import {
  FINAL_FORM_LINE,
  TIER_LABELS,
  evolutionProgress,
  evolutionRemainingLine,
  showsLabel,
  type EvolutionTier,
} from "@/lib/landing";

/**
 * The slime that evolves with a list: Named Slime → Demon Slime at 3 shows →
 * Demon Lord at 10 (lib/landing.ts#evolutionTier). Real list counts only.
 *
 * - `stack`: the landing Quest Log's card (slime on top, text centered).
 * - `banner`: an app page's PageBanner aside. A compact row on phones, the
 *   stacked card on a magic circle from 1024px.
 *
 * `gulpKey` replays the slime's gulp when it grows (default: the count).
 * Hook-free apart from Slime's useId; aria-hidden decor is the slime only.
 */
export default function EvolutionCard({
  count,
  tier,
  listName = "your list",
  layout = "stack",
  gulpKey,
  headingLevel = "h3",
}: {
  count: number | null;
  tier: EvolutionTier;
  /** "your list" / "Kyle's list". */
  listName?: string;
  layout?: "stack" | "banner";
  gulpKey?: number;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const progress = evolutionProgress(tier, count ?? 0);
  const banner = layout === "banner";

  const facts = (
    <>
      <p className="text-balance text-sm text-[rgb(200,206,218)]">
        Current form: <strong className="text-white">{TIER_LABELS[tier]}</strong>
        {count !== null && (
          <>
            {/* No-break space: the "·" stays with the form name instead of starting a line. */}
            <span aria-hidden="true">{"\u00A0· "}</span>
            <span className="sr-only">. </span>
            {showsLabel(count)} on {listName}
          </>
        )}
      </p>
      {progress ? (
        <>
          <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#95ccff] transition-[width] duration-500"
              style={{ width: `${progress.ratio * 100}%` }}
            />
          </div>
          {count !== null && <p className="text-sm text-[rgb(164,164,164)]">{evolutionRemainingLine(progress)}</p>}
        </>
      ) : (
        <p className="text-sm text-[rgb(164,164,164)]">{FINAL_FORM_LINE}</p>
      )}
    </>
  );

  if (!banner) {
    return (
      <div className="flex flex-col items-center gap-3 self-start rounded-2xl border border-[#95ccff]/25 bg-[#0a1428]/80 p-5 text-center">
        <Heading className="self-start font-mono text-xs uppercase tracking-[0.2em] text-[#95ccff]">
          Evolution
        </Heading>
        <Slime size={120} tier={tier} gulpKey={gulpKey ?? count ?? undefined} />
        {facts}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#95ccff]/25 bg-[#0a1428]/80 p-4 shadow-[0_24px_60px_-24px_rgba(93,174,241,.45)] lg:flex-col lg:gap-3 lg:p-5 lg:text-center">
      <div className="relative flex shrink-0 items-end justify-center lg:h-[160px] lg:w-full">
        {/* The magic circle spins: pause the stage offscreen (Slime pauses itself). */}
        <PauseParentWhenOffscreen />
        {/* Moonlit aura and the magic circle (1024px+): gradients and SVG, never a blur. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 hidden h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(93,174,241,.20),rgba(93,174,241,.06)_55%,transparent)] lg:block"
        />
        <MagicCircle className="absolute left-1/2 top-1/2 hidden w-[190px] -translate-x-1/2 -translate-y-1/2 lg:block" />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 hidden h-6 w-40 -translate-x-1/2 translate-y-1/3 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(149,204,255,.35),transparent_70%)] lg:block"
        />
        <Slime
          size={120}
          tier={tier}
          gulpKey={gulpKey ?? count ?? undefined}
          className="relative h-auto w-[64px] lg:w-[120px]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:w-full lg:items-center">
        <Heading className="font-mono text-xs uppercase tracking-[0.2em] text-[#95ccff] lg:self-start">
          Evolution
        </Heading>
        {facts}
      </div>
    </div>
  );
}
