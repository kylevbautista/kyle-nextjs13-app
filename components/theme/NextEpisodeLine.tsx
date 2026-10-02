"use client";
import CountdownText from "@/components/home/CountdownText";
import { airingStatusLabel, nextAiring, type AiringFields } from "@/lib/anime/airing";

/**
 * A tracker card's "what's next" line: the live countdown ("EP 12 in 2d 4h
 * 12m 09s"), or the release status when nothing is scheduled. Shared by My
 * List's ListCard and the landing's TrackerDemo so the two stay identical.
 * A finished show reads "Finished airing" so it can't be confused with the
 * card's own "Finished <date>" (the viewer's finish date).
 */
export default function NextEpisodeLine({ media }: { media: Partial<AiringFields> }) {
  const next = nextAiring(media);
  if (!next) {
    const label =
      media.status === "FINISHED"
        ? `Finished airing${media.episodes ? ` · ${media.episodes} eps` : ""}`
        : airingStatusLabel(media);
    return <p className="text-xs text-[rgb(164,164,164)]">{label}</p>;
  }
  return (
    <p className="text-xs font-semibold text-[#95ccff]">
      <CountdownText airingAt={next.airingAt} episode={next.episode} mode="row" />
    </p>
  );
}
