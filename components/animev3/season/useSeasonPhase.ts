"use client";
import { useMinuteNow } from "@/components/utils/useMinuteNow";
import { seasonPhase, type SeasonPhase } from "@/lib/anime/seasonCopy";
import type { SeasonName } from "@/lib/season";

/**
 * Where a season stands right now (upcoming / current / past), on the
 * per-minute clock. Until the clock runs (SSR, hydration) it uses
 * `fallbackMs`, the time the page's data was fetched, so server and client
 * render the same thing; `null` (error.tsx) means unknown until then.
 */
export function useSeasonPhase(
  year: number,
  season: SeasonName,
  fallbackMs: number | null
): { nowMs: number | null; phase: SeasonPhase | null } {
  const nowMs = useMinuteNow() ?? fallbackMs;
  return { nowMs, phase: nowMs === null ? null : seasonPhase(year, season, nowMs) };
}
