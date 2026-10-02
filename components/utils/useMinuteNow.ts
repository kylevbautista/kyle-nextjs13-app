"use client";
import { useSyncExternalStore } from "react";

/**
 * A per-minute clock (epoch ms), for "which day is today" and other slow
 * labels. Null during SSR and hydration, like useNow(), so server and client
 * render the same thing. Only countdown leaves need the 1 s useNow() clock;
 * using this one keeps whole panels from re-rendering every second.
 *
 * With no subscriber the clock stops and reads null again, so a component
 * that mounts later (a client navigation back to the page) renders its
 * fallback time first, never an hours-old value from the last run.
 */
let minuteNow = 0;
let minuteTimer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!minuteTimer) {
    minuteNow = Date.now();
    minuteTimer = setInterval(() => {
      minuteNow = Date.now();
      listeners.forEach((notify) => notify());
    }, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && minuteTimer) {
      clearInterval(minuteTimer);
      minuteTimer = undefined;
      minuteNow = 0;
    }
  };
}

const getSnapshot = () => minuteNow || null;
const getServerSnapshot = () => null;

/** The store itself, for tests (there is no React renderer in the unit tests). */
export const minuteClock = { subscribe, getSnapshot };

export function useMinuteNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
