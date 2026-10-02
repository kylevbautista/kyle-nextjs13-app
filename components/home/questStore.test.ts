import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track }));

/** A minimal browser: localStorage and the storage-event hooks questStore touches. */
function stubBrowser() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return store;
}

describe("markQuest", () => {
  beforeEach(() => {
    track.mockReset();
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reports each quest once, wherever it's cleared", async () => {
    const store = stubBrowser();
    const { markQuest } = await import("./questStore");
    expect(markQuest("u1", "schedule")).toBe(true);
    expect(markQuest("u1", "schedule")).toBe(false);
    expect(markQuest("u1", "share")).toBe(true);
    expect(track.mock.calls).toEqual([
      ["quest_complete", { quest: 2 }],
      ["quest_complete", { quest: 3 }],
    ]);
    expect(JSON.parse(store.get("kv:quests:u1") ?? "{}")).toEqual({ schedule: true, share: true });
  });

  it("doesn't re-report a quest finished on an earlier visit", async () => {
    const store = stubBrowser();
    store.set("kv:quests:u2", JSON.stringify({ schedule: true, share: false }));
    const { markQuest } = await import("./questStore");
    expect(markQuest("u2", "schedule")).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it("still works when storage is blocked", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    const { markQuest } = await import("./questStore");
    expect(markQuest("u3", "share")).toBe(true);
    expect(markQuest("u3", "share")).toBe(false);
    expect(track).toHaveBeenCalledTimes(1);
  });
});
