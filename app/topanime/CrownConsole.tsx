import Image from "next/image";
import type { TopAnimeItem } from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import { MagicCircle } from "@/components/home/NightSky";
import { PauseParentWhenOffscreen } from "@/components/home/Reveal";
import { SageLine } from "@/components/home/SageLine";
import { CrownIcon, StarIcon, TrophyIcon } from "@/components/theme/icons";
import { CONSOLE_PANEL } from "@/components/theme/tokens";
import { compactNumber, crownLeadText, displayName, exactNumber, type CrownLead } from "./ranking";

/**
 * The banner aside (1024px+ only): #1 on a magic circle, with its score,
 * members and its lead over the next rank. Server-rendered; the stage's
 * spinning circle pauses offscreen.
 */
export default function CrownConsole({ crown, lead }: { crown: TopAnimeItem; lead: CrownLead | null }) {
  const name = displayName(crown);
  return (
    <section
      aria-labelledby="crown-title"
      className={`${CONSOLE_PANEL} flex flex-col gap-3 p-5 shadow-[0_24px_60px_-24px_rgba(245,196,81,.35)]`}
    >
      <h2 id="crown-title" className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#95ccff]">
        <TrophyIcon className="h-5 w-5 shrink-0" />
        Rank 1
      </h2>
      <div aria-hidden="true" className="relative flex h-[172px] items-end justify-center">
        <PauseParentWhenOffscreen />
        <span className="absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,196,81,.16),rgba(93,174,241,.06)_55%,transparent)]" />
        <MagicCircle className="absolute left-1/2 top-1/2 w-[176px] -translate-x-1/2 -translate-y-1/2" />
        <span className="absolute bottom-0 left-1/2 h-6 w-40 -translate-x-1/2 translate-y-1/3 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(245,196,81,.30),transparent_70%)]" />
        <div className="relative mb-2 h-[136px] w-24 overflow-hidden rounded-md bg-[rgb(38,38,38)] shadow-[0_0_28px_-6px_rgba(245,196,81,.55)] ring-2 ring-gold/70">
          {crown.imageUrl ? (
            <Image src={crown.imageUrl} alt="" fill sizes="96px" loading="lazy" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl font-black text-gold">#1</span>
          )}
        </div>
        <CrownIcon className="absolute left-1/2 top-0 h-6 w-8 -translate-x-1/2" />
      </div>
      <p className="line-clamp-2 text-center text-base font-bold leading-6 text-white" title={name}>
        {name}
      </p>
      <p className="flex items-center justify-center gap-1 text-sm text-[rgb(200,206,218)]">
        <StarIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
        {crown.score !== null ? (
          <>
            <span className="sr-only">MyAnimeList score </span>
            <span className="font-semibold tabular-nums text-white">{crown.score.toFixed(2)}</span>
            <span className="sr-only"> out of 10</span>
          </>
        ) : (
          <span>No score yet</span>
        )}
        {crown.members !== null && (
          <>
            <span aria-hidden="true">· {compactNumber(crown.members)} members</span>
            <span className="sr-only">, {exactNumber(crown.members)} members</span>
          </>
        )}
      </p>
      {lead && (
        <SageLine kind="Analyze" size="sm" className="self-center">
          {crownLeadText(lead)}
        </SageLine>
      )}
    </section>
  );
}
