import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { minuteClock } from "./useMinuteNow";

describe("useMinuteNow's clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("ticks per minute while subscribed and reads null once stopped", () => {
    const unsubscribe = minuteClock.subscribe(() => {});
    expect(minuteClock.getSnapshot()).toBe(Date.parse("2026-10-01T12:00:00Z"));
    vi.advanceTimersByTime(60_000);
    expect(minuteClock.getSnapshot()).toBe(Date.parse("2026-10-01T12:01:00Z"));
    unsubscribe();
    expect(minuteClock.getSnapshot()).toBeNull();
  });

  it("never serves an old value after a restart", () => {
    minuteClock.subscribe(() => {})();
    vi.advanceTimersByTime(3 * 3600_000);
    expect(minuteClock.getSnapshot()).toBeNull();
    const unsubscribe = minuteClock.subscribe(() => {});
    expect(minuteClock.getSnapshot()).toBe(Date.parse("2026-10-01T15:00:00Z"));
    unsubscribe();
  });
});
