"use client";
import { useSyncExternalStore } from "react";

/**
 * The "Pause live timers" preference (WCAG 2.2.2): per-second countdowns are
 * auto-updating content, so visitors can drop every countdown on the site
 * (CountdownText) to per-minute updates. Stored per browser in localStorage.
 * No analytics here: the landing's toggle reports its own clicks.
 */

const STORAGE_KEY = "kv:live-timers";

let cached: boolean | undefined;
// Used when storage is unavailable (private mode, blocked site data).
let memory = true;
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "off") return false;
    if (value === "on") return true;
  } catch {
    // Fall through to the in-memory value.
  }
  return memory;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  cached = read();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (cached ??= read());
const getServerSnapshot = () => true;

/** The stored preference only: true = live per-second timers (the default). */
export function useLiveTimersPreference(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Whether countdowns may tick every second, controlled by the landing's pause button. */
export function useLiveSeconds(): boolean {
  return useLiveTimersPreference();
}

export function setLiveSeconds(on: boolean): void {
  memory = on;
  cached = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Keep the in-memory value for this page view.
  }
  notify();
}
