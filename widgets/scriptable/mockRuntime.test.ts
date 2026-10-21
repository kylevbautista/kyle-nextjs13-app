import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCUMENTS, MockFileSystem, createRuntime, fakePng, type RuntimeOptions } from "./mockRuntime";

const NOW = Date.UTC(2026, 9, 15, 14, 5);

/** A runtime whose globals the test drives directly (no script). */
function runtime(mode: RuntimeOptions["mode"] = { kind: "widget", family: "medium" }, extra: Partial<RuntimeOptions> = {}) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  const rt = createRuntime({ mode, nowMs: NOW, clock: { set: (ms) => vi.setSystemTime(ms) }, ...extra });
  return { g: rt.globals as Record<string, any>, result: rt.result };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("the mock runtime", () => {
  it("has the documented defaults: ListWidget, WidgetStack, WidgetText, WidgetDate, WidgetImage, Request", () => {
    const { g } = runtime();
    const w = new g.ListWidget();
    expect([w.backgroundColor, w.backgroundImage, w.backgroundGradient, w.refreshAfterDate, w.url]).toEqual([null, null, null, null, null]);
    expect([w.addAccessoryWidgetBackground, w.spacing]).toEqual([false, 0]);
    const s = w.addStack();
    expect([s.size.width, s.size.height, s.cornerRadius, s.borderWidth, s.borderColor.hex, s.layout, s.align]).toEqual([0, 0, 0, 0, "000000", "h", "top"]);
    const t = w.addText("x");
    expect([t.textOpacity, t.lineLimit, t.minimumScaleFactor, t.shadowRadius, t.align]).toEqual([1, 0, 1, 0, "left"]);
    const d = w.addDate(new Date(NOW));
    expect([d.style, d.minimumScaleFactor]).toEqual(["date", 1]);
    const img = w.addImage(g.Image.fromData(new g.Data(fakePng(10, 20))));
    expect([img.resizable, img.imageSize, img.imageOpacity, img.cornerRadius, img.contentMode, img.tintColor, img.containerRelativeShape]).toEqual([
      true,
      null,
      1,
      0,
      "fit",
      null,
      false,
    ]);
    const r = new g.Request("https://kylevb.com/");
    expect([r.method, r.timeoutInterval, r.response]).toEqual(["GET", 60, null]);
  });

  it("ListWidget has no layout or alignment methods", () => {
    const { g } = runtime();
    const w = new g.ListWidget();
    for (const name of ["layoutHorizontally", "layoutVertically", "topAlignContent", "centerAlignContent", "bottomAlignContent"]) {
      expect(w[name]).toBeUndefined();
    }
  });

  it("Font exposes exactly the documented statics", () => {
    const { g } = runtime();
    expect(g.Font.semiboldMonospacedSystemFont(11).name).toBe("semiboldMonospacedSystemFont(11)");
    expect(g.Font.blackSystemFont(20).name).toBe("blackSystemFont(20)");
    expect(g.Font.caption1().name).toBe("caption1()");
    expect(g.Font.mediumRoundedSystemFont(9).name).toBe("mediumRoundedSystemFont(9)");
    expect(g.Font.title).toBeUndefined();
    expect(g.Font.caption).toBeUndefined();
    expect(g.Font.italicMonospacedSystemFont).toBeUndefined();
    expect(g.Font.monospacedDigitSystemFont).toBeUndefined();
  });

  it("LinearGradient points default to (0,1), and a gradient left that way is a quirk", () => {
    const { g, result } = runtime({ kind: "widget", family: "small" });
    const gradient = new g.LinearGradient();
    expect([gradient.startPoint.x, gradient.startPoint.y, gradient.endPoint.x, gradient.endPoint.y]).toEqual([0, 1, 0, 1]);
    gradient.colors = [new g.Color("#000000"), new g.Color("#ffffff")];
    gradient.locations = [0, 1];
    const w = new g.ListWidget();
    w.backgroundGradient = gradient;
    g.Script.setWidget(w);
    g.Script.complete();
    expect(result().quirks).toContain("LinearGradient used with a default startPoint/endPoint (both (0,1))");
  });

  it("Color parses 3/6/8-digit hex, the alpha argument wins, and Color.dynamic keeps both", () => {
    const { g } = runtime();
    expect(new g.Color("#abc").hex).toBe("aabbcc");
    expect(new g.Color("ff000080").alpha).toBeCloseTo(0.502, 2);
    expect(new g.Color("#ff000080", 0.25).alpha).toBe(0.25);
    const dyn = g.Color.dynamic(new g.Color("#000000"), new g.Color("#ffffff"));
    expect(dyn.dynamicPair.light.hex).toBe("000000");
    expect(g.Color.clear().alpha).toBe(0);
  });

  it("loadJSON resolves on a 503 JSON body and rejects an HTML page with Scriptable's message", async () => {
    const { g } = runtime(undefined, {
      net: {
        "https://kylevb.com/a": { status: 503, body: '{"error":"unavailable"}' },
        "https://kylevb.com/b": { status: 502, body: "<html>Bad gateway</html>", mimeType: "text/html" },
      },
    });
    const a = new g.Request("https://kylevb.com/a");
    await expect(a.loadJSON()).resolves.toEqual({ error: "unavailable" });
    expect(a.response.statusCode).toBe(503);
    await expect(new g.Request("https://kylevb.com/b").loadJSON()).rejects.toThrow(
      "The data couldn't be read because it isn't in the correct format."
    );
    const s = new g.Request("https://kylevb.com/b");
    await expect(s.loadString()).resolves.toContain("Bad gateway");
    expect(s.response.statusCode).toBe(502);
  });

  it("a network error rejects and leaves response null; an unrouted host is a quirk", async () => {
    const { g, result } = runtime(undefined, { net: { "https://kylevb.com/x": { error: "The Internet connection appears to be offline." } } });
    const r = new g.Request("https://kylevb.com/x");
    await expect(r.loadString()).rejects.toThrow("offline");
    expect(r.response).toBeNull();
    await expect(new g.Request("https://elsewhere.example/").loadString()).rejects.toThrow("hostname could not be found");
    expect(result().quirks).toContain("unrouted request https://elsewhere.example/");
    // A known host's unknown path is an HTTP 404, not a network error.
    const missing = new g.Request("https://kylevb.com/nope");
    await missing.loadString();
    expect(missing.response.statusCode).toBe(404);
  });

  it("latency beyond timeoutInterval rejects 'The request timed out.' and advances the clock by the timeout", async () => {
    const { g } = runtime(undefined, { net: { "https://kylevb.com/slow": { body: "{}", latencyMs: 9000 } } });
    const r = new g.Request("https://kylevb.com/slow");
    r.timeoutInterval = 5;
    await expect(r.loadString()).rejects.toThrow("The request timed out.");
    expect(Date.now()).toBe(NOW + 5000);
  });

  it("treats timeoutInterval as an idle timeout: a reply that keeps trickling in never times out", async () => {
    const { g } = runtime(undefined, { net: { "https://kylevb.com/steady": { body: "{}", latencyMs: 9000, trickle: true } } });
    const r = new g.Request("https://kylevb.com/steady");
    r.timeoutInterval = 5;
    await expect(r.loadString()).resolves.toBe("{}");
    expect(Date.now()).toBe(NOW + 9000);
  });

  it("fires a Timer when time passes it, and a raced deadline leaves the slow request behind", async () => {
    const { g, result } = runtime(undefined, { net: { "https://kylevb.com/steady": { body: "{}", latencyMs: 9000, trickle: true } } });
    const late = new Promise((resolve) => g.Timer.schedule(3000, false, () => resolve("deadline")));
    const won = await Promise.race([new g.Request("https://kylevb.com/steady").loadString(), late]);
    expect(won).toBe("deadline");
    expect(Date.now()).toBe(NOW + 3000);
    expect(result().requests[0]).toMatchObject({ outcome: "200", abandoned: true });
    // An invalidated timer never fires.
    const timer = g.Timer.schedule(100, false, () => {
      throw new Error("fired");
    });
    timer.invalidate();
    await new g.Request("https://kylevb.com/steady").loadString();
  });

  it("keeps one timeline across parallel raced loads: a fast load beats its deadline whatever a slow sibling does", async () => {
    for (const order of ["fast first", "slow first"] as const) {
      const { g, result } = runtime(undefined, {
        net: {
          "https://kylevb.com/fast": { body: "fast", latencyMs: 40 },
          "https://kylevb.com/slow": { body: "slow", latencyMs: 9000, trickle: true },
        },
      });
      const settledAt: Record<string, number> = {};
      /** The script's raceDeadline: the load, or "deadline" after 3 s on Scriptable's Timer. */
      const raced = (path: string) => {
        const load = new g.Request(`https://kylevb.com/${path}`).loadString();
        let timer: { invalidate(): void } | null = null;
        const late = new Promise((resolve) => (timer = g.Timer.schedule(3000, false, () => resolve("deadline"))));
        return Promise.race([load, late]).then((won) => {
          timer?.invalidate();
          settledAt[path] = Date.now();
          return won;
        });
      };
      const paths = order === "fast first" ? ["fast", "slow"] : ["slow", "fast"];
      const won = Object.fromEntries((await Promise.all(paths.map(raced))).map((w, i) => [paths[i], w]));
      expect(won, order).toEqual({ fast: "fast", slow: "deadline" });
      expect(settledAt, order).toEqual({ fast: NOW + 40, slow: NOW + 3000 });
      const records = Object.fromEntries(result().requests.map((r) => [r.url.split("/").pop(), r.abandoned ?? false]));
      expect(records, order).toEqual({ fast: false, slow: true });
    }
  });

  it("delivers parallel replies in end order, each at its own end, and abandons every reply a fired deadline passed", async () => {
    /** Loads raced against a 3 s Timer each (`unraced` paths are awaited plainly); `timeoutS` sets timeoutInterval. */
    const raceAll = async (replies: Record<string, object>, order: string[], { timeoutS = 60, unraced = [] as string[] } = {}) => {
      const { g, result } = runtime(undefined, { net: Object.fromEntries(Object.entries(replies).map(([k, v]) => [`https://kylevb.com/${k}`, v])) });
      const settledAt: Record<string, number> = {};
      const raced = (path: string) => {
        const req = new g.Request(`https://kylevb.com/${path}`);
        req.timeoutInterval = timeoutS;
        const load = req.loadString();
        if (unraced.includes(path)) return load.then((won: string) => ((settledAt[path] = Date.now()), won));
        let timer: { invalidate(): void } | null = null;
        const late = new Promise((resolve) => (timer = g.Timer.schedule(3000, false, () => resolve("deadline"))));
        return Promise.race([load, late]).then((won) => {
          timer?.invalidate();
          settledAt[path] = Date.now();
          return won;
        });
      };
      const won = Object.fromEntries((await Promise.all(order.map(raced))).map((w, i) => [order[i], w]));
      const abandoned = Object.fromEntries(result().requests.map((r) => [r.url.split("/").pop(), r.abandoned ?? false]));
      return { won, settledAt, abandoned, clock: Date.now() };
    };
    // Both under the deadline: each caller runs at its own reply's end, in either start order.
    for (const order of [["fast", "slower"], ["slower", "fast"]]) {
      const r = await raceAll({ fast: { body: "f", latencyMs: 40 }, slower: { body: "s", latencyMs: 2500 } }, order);
      expect(r.settledAt, order.join()).toEqual({ fast: NOW + 40, slower: NOW + 2500 });
      expect(r.abandoned, order.join()).toEqual({ fast: false, slower: false });
    }
    // Two slow replies past one shared deadline: both abandoned, and the clock stays at the deadline.
    const slow = await raceAll({ a: { body: "a", latencyMs: 9000, trickle: true }, b: { body: "b", latencyMs: 9000, trickle: true } }, ["a", "b"]);
    expect(slow.won).toEqual({ a: "deadline", b: "deadline" });
    expect(slow.abandoned).toEqual({ a: true, b: true });
    expect(slow.clock).toBe(NOW + 3000);
    // A deadline fired by another request's reply still abandons this one (here an unraced load fires it first).
    const shared = await raceAll({ plain: { body: "p", latencyMs: 9000, trickle: true }, raced: { body: "r", latencyMs: 9000, trickle: true } }, ["plain", "raced"], { unraced: ["plain"] });
    expect(shared.won.raced).toBe("deadline");
    expect(shared.abandoned.raced).toBe(true);
    // Two stalls whose 3 s idle timeouts end exactly at the deadline: neither waits on the other.
    const stalls = raceAll({ a: { body: "a", latencyMs: 9000 }, b: { body: "b", latencyMs: 9000 } }, ["a", "b"], { timeoutS: 3 });
    const hung = new Promise((resolve) => setTimeout(() => resolve("hung"), 2000));
    expect(await Promise.race([stalls.then((r) => r.won), hung])).toEqual({ a: "deadline", b: "deadline" });
  });

  it("parallel requests advance the clock to the slowest, not the sum", async () => {
    const { g } = runtime(undefined, {
      net: { "https://kylevb.com/1": { body: "1", latencyMs: 400 }, "https://kylevb.com/2": { body: "2", latencyMs: 700 } },
    });
    await Promise.all([new g.Request("https://kylevb.com/1").load(), new g.Request("https://kylevb.com/2").load()]);
    expect(Date.now()).toBe(NOW + 700);
  });

  it("loadImage caps at 500 px in widget runs and records a quirk", async () => {
    const net = { "https://s4.anilist.co/big.png": { bytes: fakePng(1200, 900) } };
    const widget = runtime({ kind: "widget", family: "large" }, { net });
    const image = await new widget.g.Request("https://s4.anilist.co/big.png").loadImage();
    expect([image.size.width, image.size.height]).toEqual([500, 375]);
    expect(widget.result().quirks).toContain("loadImage used (downscaled to 500 px in widgets)");
    const app = runtime({ kind: "app" }, { net });
    const full = await new app.g.Request("https://s4.anilist.co/big.png").loadImage();
    expect([full.size.width, full.size.height]).toEqual([1200, 900]);
    // load() + Image.fromData keeps the full size in a widget too.
    const data = await new widget.g.Request("https://s4.anilist.co/big.png").load();
    expect(widget.g.Image.fromData(data).size.width).toBe(1200);
  });

  it("read, readString and readImage throw on a missing file; move replaces; copy refuses an existing destination", () => {
    const { g } = runtime();
    const fm = g.FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), "a.txt");
    expect(() => fm.readString(path)).toThrow();
    expect(() => fm.read(path)).toThrow();
    expect(() => fm.readImage(path)).toThrow();
    fm.writeString(path, "one");
    fm.writeString(`${path}.tmp`, "two");
    fm.move(`${path}.tmp`, path);
    expect(fm.readString(path)).toBe("two");
    expect(fm.fileExists(`${path}.tmp`)).toBe(false);
    fm.writeString(`${path}.b`, "three");
    expect(() => fm.copy(`${path}.b`, path)).toThrow();
    expect(() => fm.writeString(`${DOCUMENTS}/missing-dir/x`, "x")).toThrow();
    fm.createDirectory(`${DOCUMENTS}/deep/er`, true);
    expect(fm.isDirectory(`${DOCUMENTS}/deep`)).toBe(true);
  });

  it("cacheDirectory and temporaryDirectory are not shared between app and widget runs", () => {
    const fs = new MockFileSystem();
    const app = runtime({ kind: "app" }, { fs });
    const fm = app.g.FileManager.local();
    fm.writeString(fm.joinPath(fm.cacheDirectory(), "c"), "x");
    fm.writeString(fm.joinPath(fm.documentsDirectory(), "d"), "x");
    expect(app.result().quirks).toContain("cacheDirectory() used (not shared between the app and the widget)");
    const widget = runtime({ kind: "widget", family: "small" }, { fs });
    const wfm = widget.g.FileManager.local();
    expect(wfm.fileExists(`${DOCUMENTS}/d`)).toBe(true);
    expect(fs.list("/var/mobile/Library/Caches")).toEqual([]);
  });

  it("inline keeps one image and one text and records what it filtered", () => {
    const { g, result } = runtime({ kind: "widget", family: "accessoryInline" });
    const w = new g.ListWidget();
    w.addText("one");
    w.addText("two");
    w.addDate(new Date(NOW));
    g.Script.setWidget(w);
    g.Script.complete();
    expect(result().quirks).toEqual([
      "inline keeps one image and one text; the rest are filtered away",
      "a WidgetDate in an inline widget doesn't tick",
    ]);
  });

  it("records the platform's layout quirks: alignment in stacks, a scaled WidgetDate, element urls in small widgets", () => {
    const { g, result } = runtime({ kind: "widget", family: "small" });
    const w = new g.ListWidget();
    const s = w.addStack();
    s.url = "https://kylevb.com/";
    s.addText("x").centerAlignText();
    s.addDate(new Date(NOW)).minimumScaleFactor = 0.5;
    s.addImage(g.Image.fromData(new g.Data(fakePng(4, 4))));
    g.Script.setWidget(w);
    expect(result().quirks).toEqual([
      "text alignment is ignored in stacks (use spacers)",
      "an element url in a small widget (only widget.url counts)",
      "minimumScaleFactor on a WidgetDate (iOS 17–18 bug)",
      "a raster image without imageSize (Image.size is pixels)",
      "Script.complete called 0 times",
    ]);
  });

  it("isUsingDarkAppearance throws in widget runs", () => {
    const { g } = runtime({ kind: "widget", family: "small" });
    expect(() => g.Device.isUsingDarkAppearance()).toThrow();
    expect(runtime({ kind: "app" }).g.Device.isUsingDarkAppearance()).toBe(true);
  });

  it("config.widgetFamily is undefined in the app", () => {
    const app = runtime({ kind: "app" });
    expect(app.g.config.widgetFamily).toBeUndefined();
    expect([app.g.config.runsInApp, app.g.config.runsInWidget]).toEqual([true, false]);
    const lock = runtime({ kind: "widget", family: "accessoryCircular" });
    expect([lock.g.config.widgetFamily, lock.g.config.runsInAccessoryWidget]).toEqual(["accessoryCircular", true]);
    expect(runtime({ kind: "widget", family: "small", parameter: "" }).g.args.widgetParameter).toBeNull();
  });

  it("shadows Web and Node APIs Scriptable lacks", () => {
    const { g } = runtime();
    for (const name of ["fetch", "setTimeout", "URL", "URLSearchParams", "TextEncoder", "Intl", "structuredClone", "process", "require", "Buffer", "globalThis"]) {
      expect(name in g).toBe(true);
      expect(g[name]).toBeUndefined();
    }
    expect(typeof g.Script.name).toBe("function");
    expect(g.Script.name()).toBe("kylevb-anime");
    expect(g.URLScheme.forRunningScript()).toBe("scriptable:///run/kylevb-anime");
  });

  it("answers alerts from the queue, and cancel when it runs out", async () => {
    const { g, result } = runtime({ kind: "app", alerts: [{ choose: "Link", fields: ["abc"] }] });
    const a = new g.Alert();
    a.title = "Link your list";
    a.addTextField("placeholder", "");
    a.addAction("Link");
    a.addCancelAction("Cancel");
    expect(await a.presentAlert()).toBe(0);
    expect(a.textFieldValue(0)).toBe("abc");
    expect(await a.presentAlert()).toBe(-1);
    expect(result().alerts.map((x) => x.actions)).toEqual([
      ["Link", "Cancel"],
      ["Link", "Cancel"],
    ]);
  });
});
