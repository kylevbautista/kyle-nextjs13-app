"use client";
import { useNow } from "@/components/utils/useNow";
import { formatAirDate } from "@/lib/anime/airing";
import { AIRED_GRACE_SECONDS, formatCountdownMinutes, formatWeekdayTime } from "@/lib/landing";
import { useLiveSeconds } from "./liveTimers";

type Mode = "chip" | "row" | "compact";

const pad = (n: number) => String(n).padStart(2, "0");

/** "3d 4h 12m 09s" / "2h 14m 03s" / "14m 03s" (tabular-friendly padding). */
function formatSeconds(total: number) {
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  if (d) return `${d}d ${h}h ${pad(m)}m ${pad(s)}s`;
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

const formatMinutes = (total: number) => (total < 60 ? "<1m" : formatCountdownMinutes(total));

/**
 * Every countdown on the landing. SSR and hydration render the stable air
 * time ("EP 5 · Wed 9:30 AM PT"); the live value ticks on the shared useNow()
 * clock afterwards, per second or per minute (paused timers).
 *
 * - chip:    "EP 5 · 2h 14m 03s" / "Premiere · 3d 4h 12m 09s" (card chips)
 * - row:     "EP 13 in 2h 24m 10s" / "Premiere in …" (hero card)
 * - compact: "1d 4h 12m" only, always per minute (schedule rows; the
 *            episode and air time sit next to it, so SSR shows a skeleton)
 *
 * `seconds={false}` forces per-minute precision in chip/row mode.
 *
 * The visible text is aria-hidden and never a live region; screen readers get
 * the absolute time instead ("Episode 5 airs Oct 1, 2026, 9:30 AM PDT").
 * `data-soon` marks the last hour and `data-state` the phase, for styling.
 */
export default function CountdownText({
  airingAt,
  episode,
  mode = "chip",
  seconds: allowSeconds = true,
  className = "",
}: {
  airingAt: number;
  episode: number | null;
  mode?: Mode;
  seconds?: boolean;
  className?: string;
}) {
  const now = useNow();
  const liveSeconds = useLiveSeconds();
  const label = episode === 1 ? "Premiere" : episode ? `EP ${episode}` : "Next EP";
  const left = now === null ? null : airingAt - Math.floor(now / 1000);
  const perSecond = liveSeconds && allowSeconds && mode !== "compact";

  let text: string;
  let state: "scheduled" | "soon" | "airing" | "aired";
  if (left === null) {
    state = "scheduled";
    text =
      mode === "compact"
        ? ""
        : `${label} · ${formatWeekdayTime(airingAt)}${mode === "chip" ? " PT" : ""}`;
  } else if (left > 0) {
    state = left < 3_600 ? "soon" : "scheduled";
    const value = perSecond ? formatSeconds(left) : formatMinutes(left);
    text = mode === "compact" ? value : mode === "row" ? `${label} in ${value}` : `${label} · ${value}`;
  } else if (left > -AIRED_GRACE_SECONDS) {
    state = "airing";
    text = mode === "compact" ? "Airing now" : `${label} · Airing now`;
  } else {
    state = "aired";
    text = mode === "compact" ? "Aired" : `${label} · Aired`;
  }

  const episodeName = episode ? `Episode ${episode}` : "The next episode";
  const verb = left !== null && left <= 0 ? "aired" : "airs";
  const showDot = mode !== "compact" && (state === "soon" || state === "airing");

  return (
    <time
      dateTime={new Date(airingAt * 1000).toISOString()}
      data-soon={state === "soon" ? "" : undefined}
      data-state={state}
      className={`inline-flex items-center gap-1.5 tabular-nums data-[soon]:text-amber-200 ${className}`}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            state === "airing" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
          }`}
        />
      )}
      {mode === "compact" && left === null ? (
        <span
          aria-hidden="true"
          className="js-only inline-block h-2.5 w-16 rounded-full bg-[rgb(53,53,53)] animate-pulse"
        />
      ) : (
        <span aria-hidden="true">{text}</span>
      )}
      <span className="sr-only">{`${episodeName} ${verb} ${formatAirDate(airingAt)}`}</span>
    </time>
  );
}
