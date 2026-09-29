import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track }));

import { trackLanding, trackOnce } from "./analytics";

describe("landing analytics", () => {
  beforeEach(() => {
    track.mockReset();
  });

  it("forwards typed events to Vercel Analytics", () => {
    trackLanding("cta_click", { cta: "browse_season", location: "hero" });
    trackLanding("slime_poke");
    expect(track.mock.calls).toEqual([
      ["cta_click", { cta: "browse_season", location: "hero" }],
      ["slime_poke", {}],
    ]);
  });

  it("never lets analytics break the page", () => {
    track.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => trackLanding("live_timers", { on: false })).not.toThrow();
    expect(() => trackOnce("evolution", { tier: "lord" })).not.toThrow();
  });

  it("sends each event + props once per page view", () => {
    trackOnce("faq_open", { q: "free" });
    trackOnce("faq_open", { q: "free" });
    trackOnce("faq_open", { q: "google" });
    trackOnce("quest_complete", { quest: 1 });
    trackOnce("quest_complete", { quest: 1 });
    expect(track.mock.calls).toEqual([
      ["faq_open", { q: "free" }],
      ["faq_open", { q: "google" }],
      ["quest_complete", { quest: 1 }],
    ]);
  });

  it("dedupes on an explicit key when one is given", () => {
    trackOnce("demo", "demo_action", { action: "plus_one" });
    trackOnce("demo", "demo_action", { action: "reset" });
    trackOnce("demo_action", { action: "score" });
    expect(track.mock.calls).toEqual([
      ["demo_action", { action: "plus_one" }],
      ["demo_action", { action: "score" }],
    ]);
  });
});
