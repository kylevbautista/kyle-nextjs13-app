"use client";
import { setLiveSeconds, useLiveTimersPreference } from "@/components/home/liveTimers";
import { QUIET_BUTTON } from "./tokens";

/**
 * 'Pause live timers' / 'Resume live timers' (WCAG 2.2.2). Any page with
 * per-second countdowns (CountdownText) shows one; the preference is shared
 * site-wide (components/home/liveTimers.ts). The label states the action, so
 * there is no aria-pressed (it would announce the state twice). `onToggle`
 * lets a page report the click (the landing's analytics).
 */
export function LiveTimersToggle({
  className = "",
  onToggle,
}: {
  className?: string;
  onToggle?: (on: boolean) => void;
}) {
  const on = useLiveTimersPreference();
  return (
    <button
      type="button"
      onClick={() => {
        setLiveSeconds(!on);
        onToggle?.(!on);
      }}
      className={`${QUIET_BUTTON} ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#95ccff]" fill="currentColor">
        {on ? <path d="M4 3h2.5v10H4zM9.5 3H12v10H9.5z" /> : <path d="M5 3l8 5-8 5z" />}
      </svg>
      {on ? "Pause live timers" : "Resume live timers"}
    </button>
  );
}
