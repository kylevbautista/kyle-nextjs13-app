"use client";
import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SeasonHeader from "@/components/animev3/season/SeasonHeader";
import { useSeasonPhase } from "@/components/animev3/season/useSeasonPhase";
import PageBanner from "@/components/theme/PageBanner";
import SagePanel from "@/components/theme/SagePanel";
import { APP_CONTAINER, GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/theme/tokens";
import { SEASON_EYEBROW, seasonLabelOf } from "@/lib/anime/seasonCopy";
import { searchPath } from "@/lib/routes";
import { SEASON_MONTHS, isSeasonName, type SeasonName } from "@/lib/season";

/**
 * A failed retry mounts a fresh error page, which would drop keyboard focus
 * to <body>. A Retry pressed with focus leaves this time; the next Retry
 * button to mount within 10 s takes focus back (a ref callback, not render).
 */
let retryFocusAt = 0;

/** The URL's season, by shape only (proxy.ts already enforces the year window). */
function parseSeasonShape(segments: string[] | string | undefined): { year: number; season: SeasonName } | null {
  const parts = Array.isArray(segments) ? segments : [];
  if (parts.length !== 2 || !/^\d{4}$/.test(parts[0]) || !isSeasonName(parts[1])) return null;
  return { year: Number(parts[0]), season: parts[1] };
}

/**
 * AniList failed and there is no earlier good render to serve (ISR keeps
 * serving the last good page otherwise). The season's banner and a Great Sage
 * warning; Retry re-fetches the server render (Next 16's retry(); reset()
 * would only re-render the failed payload).
 */
export default function SeasonError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const parsed = parseSeasonShape(useParams<{ anime?: string[] }>().anime);
  // Unknown until the minute clock runs (no fetch time to fall back on here).
  const { nowMs, phase } = useSeasonPhase(parsed?.year ?? 0, parsed?.season ?? "winter", null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // Not focusable: Next focuses the segment's first element after a navigation.
    <div className="flex min-w-0 flex-col text-white">
      {parsed ? (
        <SeasonHeader
          year={parsed.year}
          season={parsed.season}
          sage={{ kind: "Warning", text: `Couldn't load ${seasonLabelOf(parsed.year, parsed.season)}.` }}
          sageKey="error"
          sub={`${SEASON_MONTHS[parsed.season].from} – ${SEASON_MONTHS[parsed.season].to} ${parsed.year}. Times are Pacific.`}
          nowMs={nowMs}
          phase={phase}
          showCurrent={false}
        />
      ) : (
        <PageBanner
          eyebrow={SEASON_EYEBROW}
          sage={{ kind: "Warning", text: "Couldn't load this season." }}
          title="Seasonal Anime"
          titleId="season-title"
        />
      )}
      <div className={APP_CONTAINER}>
        <div role="alert">
          <SagePanel
            kind="Warning"
            mood="worried"
            title="This season didn't load"
            actions={
              <>
                <button
                  ref={(node) => {
                    // Runs on every render too: only a fresh page whose focus fell to <body> takes it.
                    if (!node || Date.now() - retryFocusAt > 10_000) return;
                    const active = document.activeElement;
                    if (active && active !== document.body) return;
                    retryFocusAt = 0;
                    node.focus();
                  }}
                  type="button"
                  onClick={(event) => {
                    if (pending) return;
                    if (document.activeElement === event.currentTarget) retryFocusAt = Date.now();
                    startTransition(() => retry());
                  }}
                  aria-disabled={pending || undefined}
                  className={PRIMARY_BUTTON}
                >
                  {pending ? "Retrying…" : "Retry"}
                </button>
                {/* /anime would land right back here when this is the current season. */}
                {(parsed === null || (phase !== null && phase !== "current")) && (
                  <Link href="/anime" prefetch={false} className={GHOST_BUTTON}>
                    Current season
                  </Link>
                )}
                <Link href={searchPath()} prefetch={false} className={GHOST_BUTTON}>
                  Search anime
                </Link>
              </>
            }
          >
            AniList may be busy or rate-limiting. Wait a few seconds, then retry.
          </SagePanel>
        </div>
      </div>
    </div>
  );
}
