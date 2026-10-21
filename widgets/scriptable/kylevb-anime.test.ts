import { afterEach, describe, expect, it, vi } from "vitest";
import { WIDGET_SCRIPT_VERSION, buildWidgetPayload, type WidgetPayload } from "@/lib/widget";
import { RESTING_LINE } from "@/lib/anime/widgetCopy";
import { runScript, scriptExports, type RunOptions } from "./harness";
import { DEVICE_PROFILES, MockFileSystem, fakePng, type NetTable, type RunResult, type WidgetNode } from "./mockRuntime";
import { NOW, NOW_S, USER_ID, makeEntry, mixedEntries, payloadAt, type Scenario } from "./fixtures";
import {
  DATA_URL,
  FAMILIES,
  LINK,
  WIDGET_DIR,
  artNet,
  hasFill,
  hexOf,
  nodesOf,
  siteNet,
  textsOf,
  walk,
} from "./testkit";

type Family = (typeof FAMILIES)[number];
const MIN = 60_000;
const SETUP_URL = "scriptable:///run/kylevb-anime?kv=setup";

afterEach(() => {
  vi.useRealTimers();
});

/** One widget run: the Parameter defaults to the list link. */
async function widgetRun(
  family: Family,
  { nowMs = NOW, parameter = LINK, ...rest }: Partial<Omit<RunOptions, "mode">> & { parameter?: string | null } = {}
): Promise<RunResult & { tree: WidgetNode }> {
  const result = await runScript({ mode: { kind: "widget", family, parameter }, nowMs, ...rest });
  expect(result.setWidgetCalls).toBe(1);
  expect(result.completeCalls).toBe(1);
  expect(result.widget).not.toBeNull();
  return { ...result, tree: result.widget as WidgetNode };
}

/**
 * refreshAfterDate at a cap: measured from the clock the view was drawn at, so between `from` + cap and the end
 * of the run + cap (the run's own requests move the clock).
 */
function expectCap(result: RunResult & { tree: WidgetNode }, from: number, capMs: number) {
  const at = widgetProps(result.tree).refreshAfterDate ?? 0;
  expect(at).toBeGreaterThanOrEqual(from + capMs);
  expect(at).toBeLessThanOrEqual(from + result.elapsedMs + capMs);
}

const dataRequests = (result: RunResult) => result.requests.filter((r) => r.url.startsWith("https://kylevb.com/api/widget/v1/"));
const widgetProps = (tree: WidgetNode) => (tree as Extract<WidgetNode, { type: "widget" }>).props;
const imageSrcs = (tree: WidgetNode) => nodesOf(tree, "image").map(({ node }) => node.props.image.src);
const rowTitles = (tree: WidgetNode, titles: readonly string[]) => textsOf(tree).filter((t) => titles.includes(t));
const MIXED_TITLES = mixedEntries().map((e) => e.title.english ?? e.title.romaji ?? "");

/** A payload whose JSON was edited (e.g. tuning or an unknown field). */
const edited = (scenario: Scenario, edit: (p: WidgetPayload & Record<string, unknown>) => void, nowMs = NOW) => {
  const payload = structuredClone(payloadAt(scenario, nowMs)) as WidgetPayload & Record<string, unknown>;
  edit(payload);
  return payload;
};

// ---------------------------------------------------------------------------

describe("parameter and setup", () => {
  it("shows the setup state in all six families with no Parameter and no saved link, and requests no data", async () => {
    for (const family of FAMILIES) {
      const result = await widgetRun(family, { parameter: null, net: artNet() });
      expect(dataRequests(result)).toEqual([]);
      expect(result.quirks).toEqual([]);
      const texts = textsOf(result.tree);
      if (family === "accessoryInline") expect(texts).toEqual(["kylevb: link your list"]);
      else if (family === "accessoryCircular") expect(imageSrcs(result.tree)).toEqual(["https://kylevb.com/api/widget/art/glyph-worried.v1.png"]);
      else expect(texts).toContain("Link your list");
      expect(widgetProps(result.tree).url).toBe(SETUP_URL);
      expectCap(result, NOW, 60 * MIN);
    }
  });

  it("opens the link prompt from the setup state; a Parameter-caused state says to edit the widget and taps with from=param and why", async () => {
    const setup = await widgetRun("small", { parameter: null, net: artNet() });
    expect(widgetProps(setup.tree).url).toBe(SETUP_URL);
    const bad = await widgetRun("medium", { parameter: "my list please", net: artNet() });
    const missing = await widgetRun("large", { net: siteNet({ status: 404, body: '{"schema":1,"error":"not-found"}' }) });
    for (const [r, why] of [
      [bad, "words"],
      [missing, "missing"],
    ] as const) {
      expect(widgetProps(r.tree).url).toBe(`${SETUP_URL}&from=param&why=${why}`);
      expect(textsOf(r.tree).join(" ")).toContain("Check this widget's Parameter: touch and hold it, then Edit Widget.");
    }
    expect(textsOf(bad.tree)).toContain("That isn't a list link");
    expect(textsOf(missing.tree)).toContain("No list at that link");
    // A not-found from the in-app link (no Parameter) keeps the paste prompt and its line.
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/config.json`, { bytes: new TextEncoder().encode(JSON.stringify({ id: USER_ID })), mtime: NOW, ctime: NOW, origin: null });
    const linked = await widgetRun("medium", { parameter: null, fs, net: siteNet({ status: 404, body: '{"schema":1,"error":"not-found"}' }) });
    expect(widgetProps(linked.tree).url).toBe(SETUP_URL);
    expect(textsOf(linked.tree)).toContain("kylevb.com found no list at that link. Copy it again from your Airing Schedule.");
  });

  it("reads every link form and requests /api/widget/v1/list/<id>", async () => {
    for (const parameter of [
      LINK,
      `kylevb.com/user/${USER_ID}`,
      `https://kylevb.com/mylist/${USER_ID}?day=all`,
      `https://kyle-git-x.vercel.app/user/${USER_ID}`,
      USER_ID,
      USER_ID.toUpperCase(),
    ]) {
      const result = await widgetRun("small", { parameter, net: siteNet(payloadAt("mixed")) });
      expect(dataRequests(result).map((r) => r.url)).toEqual([DATA_URL]);
      expect(dataRequests(result)[0]).toMatchObject({ method: "GET", timeoutInterval: 5, headers: { Accept: "application/json" } });
    }
  });

  it("turns on glass from the word anywhere in the Parameter, or the saved default", async () => {
    const net = siteNet(payloadAt("mixed"));
    for (const parameter of [`glass ${LINK}`, `${LINK},GLASS`]) {
      const result = await widgetRun("medium", { parameter, net });
      expect(widgetProps(result.tree).backgroundColor).toBeUndefined();
    }
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/config.json`, {
      bytes: new TextEncoder().encode(JSON.stringify({ id: USER_ID, glass: true, name: "Kyle" })),
      mtime: NOW,
      ctime: NOW,
      origin: null,
    });
    const saved = await widgetRun("medium", { parameter: null, net, fs });
    expect(widgetProps(saved.tree).backgroundColor).toBeUndefined();
    expect(dataRequests(saved)).toHaveLength(1);
  });

  it("shows bad-link for words without an id: no request, a refresh in 60 min", async () => {
    const result = await widgetRun("small", { parameter: "glass please", net: artNet() });
    expect(dataRequests(result)).toEqual([]);
    expect(textsOf(result.tree)).toEqual(["《Warning》", "That isn't a list link"]);
    expectCap(result, NOW, 60 * MIN);
  });

  it("uses the link saved by Link my list when the Parameter is empty", async () => {
    const fs = new MockFileSystem();
    const net = siteNet(payloadAt("mixed"));
    await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }] }, nowMs: NOW, net, fs });
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null")).toEqual({ id: USER_ID, glass: false, name: "Kyle", artVersion: 1 });
    const result = await widgetRun("medium", { parameter: null, net, fs, nowMs: NOW + 5 * MIN });
    expect(dataRequests(result).map((r) => r.url)).toEqual([DATA_URL]);
    expect(textsOf(result.tree)).toContain("Next episodes");
  });
});

describe("online, per family", () => {
  const net = siteNet(payloadAt("mixed"));

  it("shows the payload's first N rows, soonest first (1/2/3/1/1/0)", async () => {
    const shown: Record<string, string[]> = {};
    for (const family of FAMILIES) {
      const result = await widgetRun(family, { net });
      expect(result.quirks).toEqual([]);
      shown[family] = rowTitles(result.tree, MIXED_TITLES);
      if (family === "accessoryInline") shown[family] = textsOf(result.tree);
    }
    expect(shown).toEqual({
      small: ["Frieren: Beyond Journey's End Season 2"],
      medium: ["That Time I Got Reincarnated as a Slime Season 4", "Frieren: Beyond Journey's End Season 2"],
      large: [
        "That Time I Got Reincarnated as a Slime Season 4",
        "Frieren: Beyond Journey's End Season 2",
        "Kaiju Patrol",
      ],
      accessoryRectangular: ["Frieren: Beyond Journey's End Season 2"],
      accessoryInline: ["Thu 7:30 AM PT · EP 4 · Frieren: Beyond Journey's End Season 2"],
      accessoryCircular: [],
    });
  });

  it("skips an aired first row in the one-row families when a later one is visible; alone it reads AIRED", async () => {
    const small = await widgetRun("small", { net });
    expect(textsOf(small.tree).slice(0, 1)).toEqual(["NEXT UP"]);
    const rect = await widgetRun("accessoryRectangular", { net });
    expect(textsOf(rect.tree)[0]).toBe("NEXT UP · EP 4");

    const alone = buildWidgetPayload({
      userId: USER_ID,
      name: "Kyle",
      entries: [makeEntry({ id: 9, title: "Just Aired", at: NOW_S - 600, episode: 5, progress: 5 })],
      nowMs: NOW,
    });
    const aloneNet = siteNet(alone);
    expect(textsOf((await widgetRun("small", { net: aloneNet })).tree)).toEqual(["AIRED", "Just Aired", "EP 5 · Aired Thu", "6:55 AM PT"]);
    expect(textsOf((await widgetRun("accessoryRectangular", { net: aloneNet })).tree)).toEqual(["AIRED · EP 5", "Just Aired", "Thu 6:55 AM PT"]);
    expect(textsOf((await widgetRun("accessoryInline", { net: aloneNet })).tree)).toEqual(["Aired Thu 6:55 AM PT · EP 5 · Just Aired"]);
  });

  it("gives rows ≥ 24 h out no WidgetDate and 1–24 h rows a timer alone in a fixed-width stack, last on its line", async () => {
    const result = await widgetRun("large", { net: siteNet(payloadAt("premiere-unknown-long")) });
    const dates = nodesOf(result.tree, "date");
    expect(dates).toHaveLength(2); // the 40-min and 5-h rows; the 26-h premiere has none
    for (const { node, ancestors } of dates) {
      const box = ancestors[ancestors.length - 1];
      const line = ancestors[ancestors.length - 2];
      expect(box.type === "stack" && box.props.size).toEqual([60, 0]);
      expect("children" in box && box.children).toEqual([node]);
      expect("children" in line && line.children[line.children.length - 1]).toBe(box);
    }
    expect(textsOf(result.tree)).toContain("Premiere · Fri 9:05 AM PT");
  });

  it("colors the last hour amber with an amber dot; aired rows get an emerald dot and 'Aired <when>', no timer", async () => {
    const result = await widgetRun("medium", { net });
    const texts = nodesOf(result.tree, "text");
    const soon = texts.find(({ node }) => node.props.text === "EP 4 · Thu 7:30 AM PT");
    const aired = texts.find(({ node }) => node.props.text === "EP 7 · Aired Thu 6:50 AM PT");
    expect(hexOf(soon?.node.props.textColor)).toBe("#fde68a");
    expect(hexOf(aired?.node.props.textColor)).toBe("#95ccff");
    const dotOf = (visit: typeof soon) => {
      const line = visit?.ancestors[visit.ancestors.length - 1];
      const first = line && "children" in line ? line.children[0] : null;
      return first?.type === "stack" ? hexOf(first.props.backgroundColor) : null;
    };
    expect(dotOf(soon)).toBe("#fbbf24");
    expect(dotOf(aired)).toBe("#34d399");
    const airedLine = aired?.ancestors[aired.ancestors.length - 1];
    expect(airedLine && walk(airedLine).some(({ node }) => node.type === "date")).toBe(false);
    const timer = nodesOf(result.tree, "date")[0];
    expect(hexOf(timer.node.props.textColor)).toBe("#fde68a");
  });

  it("drops rows aired more than 30 min before the render, backfills, and rests when none are left", async () => {
    const at905 = await widgetRun("medium", { net, nowMs: NOW + 2 * 60 * MIN });
    expect(rowTitles(at905.tree, MIXED_TITLES)).toEqual(["Kaiju Patrol", "Witch Watch Season 2"]);
    const later = await widgetRun("large", { net, nowMs: NOW + 8 * 86_400_000 });
    expect(textsOf(later.tree)).toEqual(expect.arrayContaining(["Countdowns are resting", RESTING_LINE]));
    expect(imageSrcs(later.tree).some((src) => src.endsWith("slime-worried.v1.png"))).toBe(true);
  });

  it("uses only the timer style, never scaled, and never right after the word 'in'", async () => {
    for (const family of FAMILIES) {
      const { tree } = await widgetRun(family, { net });
      const visits = walk(tree);
      visits.forEach(({ node }, index) => {
        if (node.type !== "date") return;
        expect(node.props.style).toBe("timer");
        expect(node.props.minimumScaleFactor).toBe(1);
        const before = visits.slice(0, index).reverse().find((v) => v.node.type === "text");
        if (before && before.node.type === "text") expect(before.node.props.text).not.toMatch(/\bin\s*$/i);
      });
    }
  });

  it("ends every time label with PT", async () => {
    for (const family of FAMILIES) {
      for (const scenario of ["mixed", "premiere-unknown-long"] as const) {
        const { tree } = await widgetRun(family, { net: siteNet(payloadAt(scenario)) });
        for (const text of textsOf(tree)) expect(text, text).not.toMatch(/\d{1,2}:\d{2} [AP]M(?! PT)/);
      }
    }
  });

  it("puts no text or date on a fill, in every family, state and mode", async () => {
    for (const scenario of ["mixed", "resting", "nothing-scheduled", "empty-list", "one-row"] as const) {
      for (const parameter of [LINK, `${LINK} glass`]) {
        for (const family of FAMILIES) {
          const { tree } = await widgetRun(family, { net: siteNet(payloadAt(scenario)), parameter });
          for (const { node, ancestors } of walk(tree)) {
            if (node.type !== "text" && node.type !== "date") continue;
            expect(ancestors.filter(hasFill), `${scenario} ${family} ${parameter}`).toEqual([]);
          }
        }
      }
    }
    for (const family of FAMILIES) {
      for (const run of [
        { parameter: null, net: artNet() },
        { net: siteNet({ error: "offline" }) },
      ]) {
        const { tree } = await widgetRun(family, run);
        for (const { node, ancestors } of walk(tree)) if (node.type === "text") expect(ancestors.filter(hasFill)).toEqual([]);
      }
    }
  });

  it("links: one target in small and accessory widgets; medium and large rows, footers, slime and headers each their own; none nested", async () => {
    const payload = payloadAt("mixed");
    const urls = (tree: WidgetNode) =>
      walk(tree)
        .filter(({ node }) => node.type !== "widget" && "url" in node.props && node.props.url)
        .map(({ node, ancestors }) => {
          for (const a of ancestors.slice(1)) expect("url" in a.props && a.props.url).toBeFalsy();
          return (node.props as { url: string }).url;
        });
    for (const family of ["small", "accessoryRectangular", "accessoryInline"] as const) {
      const { tree } = await widgetRun(family, { net });
      expect(urls(tree)).toEqual([]);
      expect(widgetProps(tree).url).toBe(payload.links.week);
    }
    const circular = await widgetRun("accessoryCircular", { net });
    expect(widgetProps(circular.tree).url).toBe(payload.links.schedule);
    const medium = await widgetRun("medium", { net });
    expect(widgetProps(medium.tree).url).toBe(payload.links.schedule);
    expect(urls(medium.tree)).toEqual([payload.links.schedule, payload.rows[0].url, payload.rows[1].url, payload.links.week, payload.links.list]);
    const large = await widgetRun("large", { net });
    expect(urls(large.tree)).toEqual([
      payload.links.schedule,
      payload.links.schedule,
      payload.links.list,
      payload.links.schedule,
      payload.rows[0].url,
      payload.rows[1].url,
      payload.rows[2].url,
      payload.links.week,
    ]);
    expect(payload.rows[0].url).toBe(`https://kylevb.com/mylist/${USER_ID}?day=thu`);
    expect(payload.links.week).toBe(`https://kylevb.com/mylist/${USER_ID}?day=all`);
  });

  it("spans every top-level stack across the width (a flexible spacer inside), with no text alignment in stacks", async () => {
    const spans = (node: WidgetNode): boolean =>
      node.type === "stack" &&
      ((node.props.layout === "h" && node.children.some((c) => c.type === "spacer" && c.props.length === null)) ||
        node.children.some(spans));
    for (const scenario of ["mixed", "resting", "empty-list"] as const) {
      for (const family of FAMILIES) {
        const { tree, quirks } = await widgetRun(family, { net: siteNet(payloadAt(scenario)) });
        expect(quirks).toEqual([]);
        if (!("children" in tree)) continue;
        for (const child of tree.children) if (child.type === "stack") expect(spans(child), `${scenario} ${family}`).toBe(true);
      }
    }
  });

  it("asks for a refresh at the next row boundary + 15 s, within [5 min, 30 min] online and 15 min from a saved copy", async () => {
    const medium = await widgetRun("medium", { net });
    expect(widgetProps(medium.tree).refreshAfterDate).toBe((1792072200 + 1800) * 1000 + 15_000); // 7:20:15, row 0 drops
    const small = await widgetRun("small", { net });
    expect(widgetProps(small.tree).refreshAfterDate).toBe(1792074600 * 1000 + 15_000); // 7:30:15, Frieren airs
    const quiet = await widgetRun("medium", { net: siteNet(payloadAt("nothing-scheduled")) });
    expectCap(quiet, NOW, 30 * MIN);
    const fs = new MockFileSystem();
    await widgetRun("small", { net, fs });
    const saved = await widgetRun("small", { net: siteNet({ error: "offline" }), fs, nowMs: NOW + 2 * MIN });
    expectCap(saved, NOW + 2 * MIN, 15 * MIN);
    const soon = await widgetRun("small", { net, nowMs: 1792074600 * 1000 - 2 * MIN });
    expect(widgetProps(soon.tree).refreshAfterDate).toBe(1792074600 * 1000 - 2 * MIN + soon.elapsedMs + 5 * MIN);
  });

  it("stays within 20 / 45 / 70 / 12 elements", async () => {
    const limits: Record<Family, number> = {
      small: 20,
      medium: 45,
      large: 70,
      accessoryRectangular: 12,
      accessoryInline: 12,
      accessoryCircular: 12,
    };
    for (const scenario of ["mixed", "premiere-unknown-long", "resting", "empty-list"] as const) {
      for (const family of FAMILIES) {
        const { tree } = await widgetRun(family, { net: siteNet(payloadAt(scenario)) });
        const count = walk(tree).filter(({ node }) => node.type !== "spacer" && node.type !== "widget").length;
        expect(count, `${scenario} ${family}`).toBeLessThanOrEqual(limits[family]);
      }
    }
  });

  it("shows the happy tier slime while an episode is unlogged, idle otherwise, and refreshes when one starts", async () => {
    expect(imageSrcs((await widgetRun("medium", { net })).tree)).toContain("https://kylevb.com/api/widget/art/slime-lord-happy.v1.png");
    const calm = await widgetRun("medium", { net: siteNet(payloadAt("not-hungry")) });
    expect(imageSrcs(calm.tree)).toContain("https://kylevb.com/api/widget/art/slime-named.v1.png");
    const soonHungry = edited("nothing-scheduled", (p) => {
      p.hungrySince = NOW_S + 600;
    });
    const later = await widgetRun("medium", { net: siteNet(soonHungry) });
    expect(widgetProps(later.tree).refreshAfterDate).toBe(NOW + 600_000 + 15_000);
  });

  it("uses only the Lock Screen's opaque white and gray, and loads only the glyph there", async () => {
    for (const family of ["accessoryRectangular", "accessoryInline", "accessoryCircular"] as const) {
      const result = await widgetRun(family, { net });
      for (const { node } of nodesOf(result.tree, "text")) {
        if (node.props.textColor) expect(["#ffffff", "#b4b4b4"]).toContain(hexOf(node.props.textColor));
      }
      for (const { node } of nodesOf(result.tree, "date")) expect(hexOf(node.props.textColor)).toBe("#ffffff");
      const art = result.requests.filter((r) => r.url.includes("/api/widget/art/")).map((r) => r.url);
      expect(art).toEqual(family === "accessoryRectangular" ? [] : ["https://kylevb.com/api/widget/art/glyph-lord.v1.png"]);
      expect(result.requests.some((r) => r.url.startsWith("https://s4.anilist.co/"))).toBe(false);
      expect(widgetProps(result.tree).backgroundColor).toBeUndefined();
    }
  });
});

describe("network and cache", () => {
  it("only talks to https://kylevb.com and https://s4.anilist.co, never with loadJSON, loadImage, iCloud, Keychain or DrawContext", async () => {
    const fs = new MockFileSystem();
    for (const family of FAMILIES) {
      for (const scenario of ["mixed", "empty-list"] as const) {
        const result = await widgetRun(family, { net: siteNet(payloadAt(scenario)), fs, nowMs: NOW + FAMILIES.indexOf(family) * 2 * MIN });
        for (const r of result.requests) expect(r.url).toMatch(/^https:\/\/(kylevb\.com|s4\.anilist\.co)\//);
        expect(result.quirks).toEqual([]);
      }
    }
  });

  it("saves a 200 payload with a temp file and a move; a leftover temp file never replaces it", async () => {
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/data-${USER_ID}.json.leftover.tmp`, { bytes: new TextEncoder().encode("{half"), mtime: NOW, ctime: NOW, origin: null });
    await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
    const saved = JSON.parse(fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`) ?? "null");
    expect(saved.payload).toEqual(payloadAt("mixed"));
    expect(saved.savedAt).toBeGreaterThanOrEqual(NOW);
    expect(fs.list(WIDGET_DIR).filter((p) => p.endsWith(".tmp"))).toEqual([`${WIDGET_DIR}/data-${USER_ID}.json.leftover.tmp`]);

    // The calls themselves: a writeString to a .tmp beside it, then a move onto it; never a direct write.
    const calls: string[] = [];
    await widgetRun("medium", {
      net: siteNet(payloadAt("mixed")),
      fs: new MockFileSystem(),
      patch: (g) => {
        const local = g.FileManager.local;
        g.FileManager.local = () => {
          const fm = local();
          const writeString = fm.writeString.bind(fm);
          const move = fm.move.bind(fm);
          fm.writeString = (path: string, text: string) => (calls.push(`write ${path}`), writeString(path, text));
          fm.move = (from: string, to: string) => (calls.push(`move ${from} -> ${to}`), move(from, to));
          return fm;
        };
      },
    });
    const data = `${WIDGET_DIR}/data-${USER_ID}.json`;
    const write = calls.findIndex((c) => new RegExp(`^write ${data}\\.[^/]+\\.tmp$`).test(c));
    expect(write).toBeGreaterThanOrEqual(0);
    expect(calls[write + 1]).toBe(`move ${calls[write].slice(6)} -> ${data}`);
    expect(calls).not.toContain(`write ${data}`);
  });

  it("reuses a payload saved less than 90 s ago without a request", async () => {
    const fs = new MockFileSystem();
    const net = siteNet(payloadAt("mixed"));
    await widgetRun("small", { net, fs });
    const again = await widgetRun("medium", { net, fs, nowMs: NOW + 60_000 });
    expect(dataRequests(again)).toEqual([]);
    const later = await widgetRun("medium", { net, fs, nowMs: NOW + 120_000 });
    expect(dataRequests(later)).toHaveLength(1);
  });

  it("shows a saved copy when kylevb.com doesn't answer: the saved stamp on medium, small and large; Lock Screen unchanged", async () => {
    const fs = new MockFileSystem();
    const online = siteNet(payloadAt("mixed"));
    const offline = siteNet({ error: "The Internet connection appears to be offline." });
    const before: Record<string, string[]> = {};
    for (const family of FAMILIES) before[family] = textsOf((await widgetRun(family, { net: online, fs, nowMs: NOW + 2 * MIN })).tree);
    const at = NOW + 10 * MIN;
    const medium = textsOf((await widgetRun("medium", { net: offline, fs, nowMs: at })).tree);
    expect(medium).toContain("Saved Oct 15, 7:05 AM PT");
    expect(medium).not.toContain("Pacific Time");
    const small = textsOf((await widgetRun("small", { net: offline, fs, nowMs: at })).tree);
    expect(small[0]).toBe("Saved Oct 15, 7:05 AM PT");
    const large = textsOf((await widgetRun("large", { net: offline, fs, nowMs: at })).tree);
    expect(large).toEqual(expect.arrayContaining(["《Report》", "Couldn't reach kylevb.com. Showing air times saved Oct 15, 7:05 AM PT."]));
    // The Sage line names the saved time, so the card under it keeps "Pacific Time" (no room for both).
    expect(large).toContain("Pacific Time");
    expect(large).not.toContain("Saved Oct 15, 7:05 AM PT");
    for (const family of ["accessoryRectangular", "accessoryInline", "accessoryCircular"] as const) {
      const run = await widgetRun(family, { net: offline, fs, nowMs: at });
      expect(dataRequests(run)).toHaveLength(1);
      expect(dataRequests(run)[0].outcome).toBe("network");
      const runs = JSON.parse(fs.text(`${WIDGET_DIR}/runs.json`) ?? "[]");
      expect(runs.at(-1)).toMatchObject({ fam: family, out: "saved" });
      expectCap(run, at, 15 * MIN);
      expect(textsOf(run.tree)).toEqual(before[family]);
    }
  });

  it("says Couldn't reach kylevb.com with no saved copy: a tap refreshes, a refresh in 15 min", async () => {
    const result = await widgetRun("medium", { net: siteNet({ error: "offline" }) });
    expect(textsOf(result.tree)).toEqual(expect.arrayContaining(["《Report》", "Couldn't reach kylevb.com", "Your schedule appears after the next successful refresh. Tap to try again."]));
    // The Parameter named the list, so the app's refresh can say a missing list is fixed in Edit Widget.
    expect(widgetProps(result.tree).url).toBe(`scriptable:///run/kylevb-anime?kv=refresh&id=${USER_ID}&from=param`);
    expectCap(result, NOW, 15 * MIN);
  });

  it("doesn't show a saved copy older than 7 days", async () => {
    const fs = new MockFileSystem();
    await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
    const result = await widgetRun("medium", { net: siteNet({ error: "offline" }), fs, nowMs: NOW + 7 * 86_400_000 + MIN });
    expect(textsOf(result.tree)).toContain("Couldn't reach kylevb.com");
  });

  it("falls back to the saved copy on an HTML 502 page and a 503 JSON body", async () => {
    for (const reply of [
      { status: 502, body: "<html><body>Bad gateway</body></html>", mimeType: "text/html" },
      { status: 503, body: '{"schema":1,"error":"unavailable"}' },
    ]) {
      const fs = new MockFileSystem();
      await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
      const result = await widgetRun("medium", { net: siteNet(reply), fs, nowMs: NOW + 5 * MIN });
      expect(textsOf(result.tree)).toContain("Saved Oct 15, 7:05 AM PT");
      expect(result.quirks).toEqual([]);
    }
  });

  it("rejects schema 2, an unknown state, foreign link hosts and a foreign art base, and keeps the saved copy", async () => {
    const bad = [
      edited("mixed", (p) => Object.assign(p, { schema: 2 })),
      edited("mixed", (p) => Object.assign(p, { state: "party" })),
      edited("mixed", (p) => (p.links.list = "https://evil.example/user/x")),
      edited("mixed", (p) => (p.links.week = "https://kylevb.com.evil.example/x")),
      edited("mixed", (p) => (p.art.base = "https://evil.example/api/widget/art/")),
    ];
    for (const payload of bad) {
      const fs = new MockFileSystem();
      await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
      const savedBefore = fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`);
      const result = await widgetRun("medium", { net: siteNet(payload), fs, nowMs: NOW + 5 * MIN });
      expect(textsOf(result.tree)).toContain("Saved Oct 15, 7:05 AM PT");
      expect(fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`)).toBe(savedBefore);
      for (const r of result.requests) expect(r.url).not.toContain("evil");
    }
  });

  it("draws the #353535 placeholder for foreign cover hosts and bad colors", async () => {
    const payload = edited("mixed", (p) => {
      p.rows[0].cover = "https://evil.example/cover.jpg";
      p.rows[0].color = "red";
      p.rows[1].cover = null;
      p.rows[1].color = "#12345";
    });
    const result = await widgetRun("medium", { net: siteNet(payload) });
    const covers = nodesOf(result.tree, "stack").filter(({ node }) => node.props.size[0] > 20 && node.props.cornerRadius === 4);
    expect(covers.map(({ node }) => hexOf(node.props.backgroundColor))).toEqual(["#353535", "#353535"]);
    expect(covers.every(({ node }) => node.children.length === 0)).toBe(true);
    expect(result.requests.some((r) => r.url.includes("evil"))).toBe(false);
  });

  it("404: No list at that link, the saved copy deleted, a refresh in 60 min", async () => {
    const fs = new MockFileSystem();
    await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
    expect(fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`)).not.toBeNull();
    const result = await widgetRun("medium", { net: siteNet({ status: 404, body: '{"schema":1,"error":"not-found"}' }), fs, nowMs: NOW + 5 * MIN });
    expect(textsOf(result.tree)).toEqual(expect.arrayContaining(["《Warning》", "No list at that link"]));
    expect(fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`)).toBeNull();
    expectCap(result, NOW + 5 * MIN, 60 * MIN);
  });

  it("410: Update this widget with the server's message; a tap opens its GitHub URL; a refresh in 6 h", async () => {
    const body = JSON.stringify({ schema: 1, error: "outdated", message: "Version 2 is out.", url: "https://github.com/kylevbautista/x" });
    const result = await widgetRun("medium", { net: siteNet({ status: 410, body }) });
    expect(textsOf(result.tree)).toEqual(expect.arrayContaining(["Update this widget", "Version 2 is out."]));
    expect(widgetProps(result.tree).url).toBe("https://github.com/kylevbautista/x");
    expectCap(result, NOW, 6 * 60 * MIN);
    const foreign = await widgetRun("small", {
      net: siteNet({ status: 410, body: '{"schema":1,"error":"outdated","url":"https://evil.example/"}' }),
    });
    expect(widgetProps(foreign.tree).url).toBe("https://github.com/kylevbautista/kyle-nextjs13-app/blob/main/widgets/scriptable/kylevb-anime.js");
  });

  it("ignores and deletes a corrupt saved file", async () => {
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/data-${USER_ID}.json`, { bytes: new TextEncoder().encode("{not json"), mtime: NOW, ctime: NOW, origin: null });
    const result = await widgetRun("medium", { net: siteNet({ error: "offline" }), fs });
    expect(textsOf(result.tree)).toContain("Couldn't reach kylevb.com");
    expect(fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`)).toBeNull();
  });

  it("ignores unknown payload fields (an additive schema)", async () => {
    const plain = await widgetRun("large", { net: siteNet(payloadAt("mixed")) });
    const extra = edited("mixed", (p) => {
      p.future = { chips: true };
      Object.assign(p.rows[0], { badge: "NEW" });
      Object.assign(p.copy, { newLine: "Hello" });
    });
    const withExtra = await widgetRun("large", { net: siteNet(extra) });
    expect(withExtra.tree).toEqual(plain.tree);
  });
});

describe("deadlines", () => {
  it("times out a JSON reply slower than 5 s and renders the saved copy by 5.3 s", async () => {
    const fs = new MockFileSystem();
    await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
    const slow = siteNet({ body: JSON.stringify(payloadAt("mixed")), latencyMs: 9000 });
    const result = await widgetRun("medium", { net: slow, fs, nowMs: NOW + 5 * MIN });
    expect(dataRequests(result)[0].outcome).toBe("timeout");
    expect(result.elapsedMs).toBeLessThanOrEqual(5300);
    expect(textsOf(result.tree)).toContain("Saved Oct 15, 7:05 AM PT");
  });

  it("takes the next request's timeout from the saved payload's tuning (clamped 2–8 s)", async () => {
    for (const [asked, used] of [
      [3, 3],
      [30, 8],
      [0.5, 2],
    ]) {
      const fs = new MockFileSystem();
      await widgetRun("small", { net: siteNet(edited("mixed", (p) => (p.tuning.jsonTimeoutS = asked))), fs });
      const result = await widgetRun("small", { net: siteNet(payloadAt("mixed")), fs, nowMs: NOW + 5 * MIN });
      expect(dataRequests(result)[0].timeoutInterval).toBe(used);
    }
  });

  it("skips covers when the JSON took more than 3 s, and fetches at most tuning.coverFetches", async () => {
    const slow = siteNet(payloadAt("mixed"), { [DATA_URL]: { body: JSON.stringify(payloadAt("mixed")), latencyMs: 3500 } });
    const late = await widgetRun("large", { net: slow });
    expect(late.requests.filter((r) => r.url.startsWith("https://s4.anilist.co/"))).toEqual([]);
    const one = await widgetRun("large", { net: siteNet(edited("mixed", (p) => (p.tuning.coverFetches = 1))) });
    expect(one.requests.filter((r) => r.url.startsWith("https://s4.anilist.co/"))).toHaveLength(1);
    const three = await widgetRun("large", { net: siteNet(payloadAt("mixed")) });
    expect(three.requests.filter((r) => r.url.startsWith("https://s4.anilist.co/"))).toHaveLength(3);
  });

  it("fetches missing art only in the first 2 s; otherwise draws the gradient with both points set", async () => {
    const net = siteNet(payloadAt("mixed"), { [DATA_URL]: { body: JSON.stringify(payloadAt("mixed")), latencyMs: 2500 } });
    const result = await widgetRun("medium", { net });
    expect(result.requests.filter((r) => r.url.includes("/api/widget/art/"))).toEqual([]);
    const props = widgetProps(result.tree);
    expect(props.backgroundImage).toBeUndefined();
    expect(props.backgroundGradient).toEqual({
      colors: [
        { hex: "#050915", alpha: 1 },
        { hex: "#0a1428", alpha: 1 },
        { hex: "#0e1d33", alpha: 1 },
      ],
      locations: [0, 0.55, 1],
      start: [0, 0],
      end: [0, 1],
    });
    expect(result.quirks).toEqual([]);
  });

  it("fetches art once per art version and reuses it; a new version downloads the new names", async () => {
    const fs = new MockFileSystem();
    const first = await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs });
    expect(first.requests.filter((r) => r.url.includes("/api/widget/art/")).map((r) => r.url)).toEqual([
      "https://kylevb.com/api/widget/art/slime-lord-happy.v1.png",
      "https://kylevb.com/api/widget/art/sky-medium-3x.v1.png",
    ]);
    const second = await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs, nowMs: NOW + 5 * MIN });
    expect(second.requests.filter((r) => r.url.includes("/api/widget/art/"))).toEqual([]);
    expect(widgetProps(second.tree).backgroundImage?.src).toBe("https://kylevb.com/api/widget/art/sky-medium-3x.v1.png");
    const v2 = edited("mixed", (p) => (p.art.version = 2));
    const third = await widgetRun("medium", { net: { ...siteNet(v2), ...artNet(2) }, fs, nowMs: NOW + 10 * MIN });
    expect(third.requests.filter((r) => r.url.includes("/api/widget/art/")).map((r) => r.url)).toEqual([
      "https://kylevb.com/api/widget/art/slime-lord-happy.v2.png",
      "https://kylevb.com/api/widget/art/sky-medium-3x.v2.png",
    ]);
  });

  it("picks the sky's density from screenScale(), the large one capped by tuning.largeSkyMaxScale", async () => {
    const sky = (r: RunResult & { tree: WidgetNode }) => widgetProps(r.tree).backgroundImage?.src.split("/").pop();
    expect(sky(await widgetRun("large", { net: siteNet(payloadAt("mixed")) }))).toBe("sky-large-3x.v1.png");
    const capped = siteNet(edited("mixed", (p) => (p.tuning.largeSkyMaxScale = 2)));
    expect(sky(await widgetRun("large", { net: capped }))).toBe("sky-large-2x.v1.png");
    expect(sky(await widgetRun("medium", { net: capped }))).toBe("sky-medium-3x.v1.png");
    expect(sky(await widgetRun("small", { net: siteNet(payloadAt("mixed")), device: DEVICE_PROFILES.se3 }))).toBe("sky-small-2x.v1.png");
  });

  it("evicts covers beyond 60 files, oldest first, down to 48", async () => {
    const fs = new MockFileSystem();
    const net = siteNet(payloadAt("mixed"));
    await widgetRun("large", { net, fs });
    for (let i = 0; i < 70; i++) {
      fs.files.set(`${WIDGET_DIR}/covers/${900000 + i}-00000000.img`, { bytes: fakePng(1, 1), mtime: NOW - (100 - i) * MIN, ctime: NOW, origin: null });
    }
    await widgetRun("large", { net, fs, nowMs: NOW + MIN });
    const left = fs.list(`${WIDGET_DIR}/covers/`);
    expect(left).toHaveLength(48);
    expect(left).toContain(`${WIDGET_DIR}/covers/900069-00000000.img`);
    expect(left).not.toContain(`${WIDGET_DIR}/covers/900000-00000000.img`);
  });
});

describe("states", () => {
  it("empty list: the owner hasn't added any anime yet, Recommend: predation. (worried), a tap opens /anime", async () => {
    for (const family of ["small", "medium", "large"] as const) {
      const { tree } = await widgetRun(family, { net: siteNet(payloadAt("empty-list")) });
      expect(textsOf(tree)).toContain("Kyle hasn't added any anime yet");
      if (family !== "small") expect(textsOf(tree)).toContain("Recommend: predation.");
      expect(imageSrcs(tree).some((s) => s.endsWith("slime-worried.v1.png"))).toBe(true);
      expect(widgetProps(tree).url).toBe("https://kylevb.com/anime");
    }
  });

  it("nothing scheduled: the schedule's title and the skips line (the sage slime)", async () => {
    const { tree } = await widgetRun("medium", { net: siteNet(payloadAt("nothing-scheduled")) });
    expect(textsOf(tree)).toEqual([
      "《Notice》",
      "Next episodes",
      "Pacific Time",
      "《Report》",
      "Nothing on Kyle's airing schedule",
      "Completed and dropped shows stay out of the way.",
    ]);
    expect(imageSrcs(tree).some((s) => s.endsWith("slime-sage.v1.png"))).toBe(true);
  });

  it("rests when the server says so, and when every saved row has aged out days later (worried)", async () => {
    const fromServer = await widgetRun("medium", { net: siteNet(payloadAt("resting")) });
    expect(textsOf(fromServer.tree)).toEqual(expect.arrayContaining(["Countdowns are resting", RESTING_LINE]));
    const fs = new MockFileSystem();
    await widgetRun("large", { net: siteNet(payloadAt("mixed")), fs });
    const aged = await widgetRun("small", { net: siteNet({ error: "offline" }), fs, nowMs: NOW + 3 * 86_400_000 + 4 * 60 * MIN });
    expect(textsOf(aged.tree)).toEqual(["NEXT UP", "Monthly Example Season 2", "EP 14 · Thu Oct 22", "10:00 AM PT"].map((t, i) => (i === 0 ? "Saved Oct 15, 7:05 AM PT" : t)));
    const soonList = buildWidgetPayload({
      userId: USER_ID,
      name: "Kyle",
      entries: [makeEntry({ id: 1, title: "Tonight", at: NOW_S + 3600 }), makeEntry({ id: 2, title: "Later", at: NOW_S + 7200 })],
      nowMs: NOW,
    });
    const fs2 = new MockFileSystem();
    await widgetRun("medium", { net: siteNet(soonList), fs: fs2 });
    const gone = await widgetRun("medium", { net: siteNet({ error: "offline" }), fs: fs2, nowMs: NOW + 86_400_000 });
    expect(textsOf(gone.tree)).toEqual(expect.arrayContaining(["Countdowns are resting", "Saved Oct 15, 7:05 AM PT"]));
    expect(imageSrcs(gone.tree).some((s) => s.endsWith("slime-worried.v1.png"))).toBe(true);
  });

  it("labels a premiere, an unknown episode and clips an 80-grapheme title", async () => {
    const payload = payloadAt("premiere-unknown-long");
    expect(Array.from(payload.rows[0].title)).toHaveLength(80);
    const large = textsOf((await widgetRun("large", { net: siteNet(payload) })).tree);
    expect(large).toEqual(expect.arrayContaining([payload.rows[0].title, "Next EP · Thu 12:05 PM PT", "Premiere · Fri 9:05 AM PT"]));
    const premiereFirst = buildWidgetPayload({
      userId: USER_ID,
      name: "Kyle",
      entries: [
        makeEntry({ id: 1, title: "Brand New", at: NOW_S + 26 * 3600, episode: 1, status: "planning", mediaStatus: "NOT_YET_RELEASED" }),
        makeEntry({ id: 2, title: "Unnumbered", at: NOW_S + 30 * 3600, episode: null, episodes: null }),
      ],
      nowMs: NOW,
    });
    expect(textsOf((await widgetRun("accessoryRectangular", { net: siteNet(premiereFirst) })).tree)[0]).toBe("NEXT UP · PREMIERE");
    expect(textsOf((await widgetRun("small", { net: siteNet(premiereFirst) })).tree)).toEqual(["NEXT UP", "Brand New", "Premiere · Fri", "9:05 AM PT"]);
    const unknownFirst = buildWidgetPayload({ userId: USER_ID, name: "Kyle", entries: [makeEntry({ id: 2, title: "Unnumbered", at: NOW_S + 3600 * 2, episode: null, episodes: null })], nowMs: NOW });
    expect(textsOf((await widgetRun("accessoryRectangular", { net: siteNet(unknownFirst) })).tree)[0]).toBe("NEXT UP");
  });

  it("shows the weekday in date-form rows", async () => {
    const fs = new MockFileSystem();
    const { tree } = await widgetRun("medium", { net: siteNet(payloadAt("mixed")), fs, nowMs: NOW + 3 * 86_400_000 });
    expect(textsOf(tree)).toContain("EP 14 · Thu Oct 22, 10:00 AM PT");
  });

  it("leaves the other slots blank with one row (the widget keeps the slot grid; the card stretches its lone row)", async () => {
    for (const [family, slots] of [
      ["medium", 2],
      ["large", 3],
    ] as const) {
      const { tree } = await widgetRun(family, { net: siteNet(payloadAt("one-row")) });
      expect(rowTitles(tree, ["Only Show"])).toEqual(["Only Show"]);
      const empty = nodesOf(tree, "stack").filter(
        ({ node }) => node.props.size[1] > 30 && node.children.length === 1 && node.children[0].type === "spacer"
      );
      expect(empty).toHaveLength(slots - 1);
    }
  });

  it("keeps the drawn Sage line within two lines on every phone and iPad (SF Mono at its floor, geometry from the tree)", async () => {
    const S = (await scriptExports()) as any;
    const SF_MONO_EM = 1266 / 2048;
    const devices = [...Object.values(DEVICE_PROFILES), { name: "iPad mini", screen: [744, 1133], scale: 2 }] as const;
    const fontSize = (font: string) => Number(/\((\d+(?:\.\d+)?)\)/.exec(font)?.[1]);
    /** Lines the Sage sentence needs: wrapped by words in SF Mono columns at its scale floor, in the box as drawn. */
    const sageLines = (tree: WidgetNode, width: number) => {
      const sentence = nodesOf(tree, "text").find(({ node }) => node.props.lineLimit === 2 && /^(Thought Acceleration|Couldn't reach|kylevb\.com had)/.test(node.props.text));
      if (!sentence) throw new Error("no Sage line");
      const box = sentence.ancestors[sentence.ancestors.length - 1];
      if (box.type !== "stack") throw new Error("no Sage box");
      const pad = widgetProps(tree).padding;
      const [, right, , left] = pad === "default" ? [16, 16, 16, 16] : pad;
      // 8: a flexible spacer's possible minimum (Scriptable's to choose).
      const [, boxRight, , boxLeft] = box.props.padding ?? [0, 0, 0, 0];
      let inner = width - left - right - boxLeft - boxRight - 2 * box.props.borderWidth - 8;
      for (const child of box.children) {
        if (child === sentence.node) continue;
        if (child.type === "spacer") inner -= child.props.length ?? 0;
        if (child.type === "text") inner -= [...child.props.text].reduce((w, c) => w + (/[《》]/.test(c) ? 1 : SF_MONO_EM), 0) * fontSize(child.props.font);
      }
      const perLine = Math.floor(inner / (fontSize(sentence.node.props.font) * SF_MONO_EM * sentence.node.props.minimumScaleFactor));
      let count = 1;
      let used = 0;
      for (const word of sentence.node.props.text.split(/(?<=[ -])/)) {
        if (used && used + Array.from(word.trimEnd()).length > perLine) {
          count += 1;
          used = 0;
        }
        used += Array.from(word).length;
      }
      return count;
    };
    // The standing line at the name limit and past it, and the saved lines with the widest stamp (10:05 AM PT).
    const trees: [string, (device: (typeof devices)[number]) => Promise<WidgetNode>][] = [
      ...["M".repeat(12), "M".repeat(13), "Maximiliano-Alejandro", "Maximilianoalejandro"].map(
        (name) => [name, async (device: (typeof devices)[number]) => {
          const payload = buildWidgetPayload({ userId: USER_ID, name, entries: mixedEntries(), nowMs: NOW });
          return (await widgetRun("large", { net: siteNet(payload), device: device as never })).tree;
        }] as [string, (device: (typeof devices)[number]) => Promise<WidgetNode>]
      ),
      ...[{ error: "offline" }, { status: 503, body: '{"schema":1,"error":"unavailable"}' }].map(
        (reply) => [JSON.stringify(reply), async (device: (typeof devices)[number]) => {
          const fs = new MockFileSystem();
          const at = NOW + 3 * 60 * MIN;
          await widgetRun("large", { net: siteNet(payloadAt("mixed", at)), device: device as never, fs, nowMs: at });
          return (await widgetRun("large", { net: siteNet(reply), device: device as never, fs, nowMs: at + 10 * MIN })).tree;
        }] as [string, (device: (typeof devices)[number]) => Promise<WidgetNode>]
      ),
    ];
    for (const device of devices) {
      const width = S.sizeRow({ width: device.screen[0], height: device.screen[1] }, device.name.startsWith("iPad"))[3];
      for (const [label, draw] of trees) {
        const tree = await draw(device);
        const want = label.startsWith("{") ? /saved Oct 15, 10:05 AM PT\.$/ : /^Thought Acceleration:/;
        expect(textsOf(tree).some((t) => want.test(t)), `${device.name} ${label}`).toBe(true);
        expect(sageLines(tree, width), `${device.name} ${label}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("shows This widget hit an error for a render bug (never Scriptable's own), and a tap refreshes", async () => {
    const boom = (g: Record<string, { semiboldSystemFont: (size: number) => unknown }>) => {
      const font = g.Font;
      const real = font.semiboldSystemFont;
      font.semiboldSystemFont = (size: number) => {
        if (size === 12) throw new Error("boom");
        return real(size);
      };
    };
    const result = await widgetRun("medium", { net: siteNet(payloadAt("mixed")), patch: boom });
    expect(textsOf(result.tree)).toEqual(["《Warning》", "This widget hit an error", "Tap to try again. The script's Diagnostics shows what went wrong."]);
    // The tap refreshes this widget's own list (its Parameter's, so a missing list is fixed in Edit Widget), and the
    // error is kept for Diagnostics.
    expect(widgetProps(result.tree).url).toBe(`scriptable:///run/kylevb-anime?kv=refresh&id=${USER_ID}&from=param`);
    const runs = JSON.parse(result.fs.text(`${WIDGET_DIR}/runs.json`) ?? "[]");
    expect(runs.at(-1)).toMatchObject({ fam: "medium", out: "error", err: "boom" });
    const app = await runScript({ mode: { kind: "app", alerts: [{ choose: "Diagnostics" }, "cancel", "cancel"] }, nowMs: NOW + 3 * MIN, fs: result.fs });
    expect(app.alerts[1].message).toMatch(/Last error, \d+ min ago \(medium\): boom/);
    expect(result.logs.some((l) => l.includes("boom"))).toBe(true);
    const worse = await widgetRun("small", {
      net: siteNet(payloadAt("mixed")),
      patch: (g) => {
        g.Font.semiboldSystemFont = () => {
          throw new Error("worse");
        };
        g.Font.semiboldMonospacedSystemFont = () => {
          throw new Error("worse");
        };
      },
    });
    expect(textsOf(worse.tree)).toEqual(["This widget hit an error"]);
    expect(widgetProps(worse.tree).url).toBe(`scriptable:///run/kylevb-anime?kv=refresh&id=${USER_ID}&from=param`);
    // From the in-app link: a plain refresh. Over a Parameter that names no list: that Parameter's problem.
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/config.json`, { bytes: new TextEncoder().encode(JSON.stringify({ id: USER_ID })), mtime: NOW, ctime: NOW, origin: null });
    const linked = await widgetRun("medium", { parameter: null, fs, net: siteNet(payloadAt("mixed")), patch: boom });
    expect(widgetProps(linked.tree).url).toBe(`scriptable:///run/kylevb-anime?kv=refresh&id=${USER_ID}`);
    // A Parameter that names no list: its state view throws too (the first stack), and the error's tap still opens
    // that Parameter's problem, words or a link that isn't a list link.
    const firstStack = (g: Record<string, any>) => {
      const real = g.ListWidget.prototype.addStack;
      let thrown = false;
      g.ListWidget.prototype.addStack = function (...a: unknown[]) {
        if (!thrown) {
          thrown = true;
          throw new Error("render bug");
        }
        return real.apply(this, a);
      };
    };
    for (const [parameter, why] of [
      ["glas", "words"],
      ["https://kylevb.com/anime/2026/fall", "link"],
    ] as const) {
      const run = await widgetRun("medium", { parameter, net: artNet(), patch: firstStack });
      expect(textsOf(run.tree), parameter).toContain("This widget hit an error");
      expect(widgetProps(run.tree).url, parameter).toBe(`${SETUP_URL}&from=param&why=${why}`);
    }
  });
});

describe("glass", () => {
  it("drops the background, covers and placeholders, uses dynamic colors, and tints the glyph", async () => {
    for (const family of ["small", "medium", "large"] as const) {
      const { tree } = await widgetRun(family, { net: siteNet(payloadAt("mixed")), parameter: `${LINK} glass` });
      const props = widgetProps(tree);
      expect([props.backgroundColor, props.backgroundImage, props.backgroundGradient]).toEqual([undefined, undefined, undefined]);
      const images = nodesOf(tree, "image");
      expect(images.map(({ node }) => node.props.image.src)).toEqual(["https://kylevb.com/api/widget/art/glyph-lord.v1.png"]);
      expect(images[0].node.props.tintColor).toEqual({ dynamic: { light: { hex: "#1e5a96", alpha: 1 }, dark: { hex: "#95ccff", alpha: 1 } } });
      for (const { node } of nodesOf(tree, "text")) expect(node.props.textColor && "dynamic" in node.props.textColor).toBe(true);
      expect(nodesOf(tree, "stack").filter(({ node }) => node.props.cornerRadius === 4)).toEqual([]);
    }
  });
});

describe("accessory", () => {
  it("inline: exactly one image and one text, no WidgetDate", async () => {
    for (const scenario of ["mixed", "resting", "empty-list"] as const) {
      const { tree, quirks } = await widgetRun("accessoryInline", { net: siteNet(payloadAt(scenario)) });
      expect(quirks).toEqual([]);
      expect(nodesOf(tree, "image")).toHaveLength(1);
      expect(nodesOf(tree, "text")).toHaveLength(1);
      expect(nodesOf(tree, "date")).toHaveLength(0);
    }
  });

  it("rectangular has no accessory background; circular has it and holds only the glyph (or 'kylevb')", async () => {
    const rect = await widgetRun("accessoryRectangular", { net: siteNet(payloadAt("mixed")) });
    expect(widgetProps(rect.tree).accessoryBackground).toBe(false);
    const circular = await widgetRun("accessoryCircular", { net: siteNet(payloadAt("mixed")) });
    expect(widgetProps(circular.tree).accessoryBackground).toBe(true);
    expect(imageSrcs(circular.tree)).toEqual(["https://kylevb.com/api/widget/art/glyph-lord.v1.png"]);
    expect(nodesOf(circular.tree, "image")[0].node.props.imageSize).toEqual([40, 35]);
    expect(textsOf(circular.tree)).toEqual([]);
    const noArt = await widgetRun("accessoryCircular", { net: { [DATA_URL]: { body: JSON.stringify(payloadAt("mixed")) } } });
    expect(textsOf(noArt.tree)).toEqual(["kylevb"]);
  });
});

describe("in-app", () => {
  const net = siteNet(payloadAt("mixed"));
  const link = { choose: "Link", fields: [LINK] };

  it("Link my list checks the link with the server, saves config.json and prefetches the 15 art files for this density", async () => {
    const fs = new MockFileSystem();
    const result = await runScript({ mode: { kind: "app", alerts: [{ choose: "Link my list…" }, link, "cancel", "cancel"] }, nowMs: NOW, net, fs });
    expect(result.quirks).toEqual([]);
    expect(result.completeCalls).toBe(1);
    expect(result.alerts.map((a) => a.title)).toEqual([
      `kylevb Anime widget v${WIDGET_SCRIPT_VERSION}`,
      "Link your list",
      "《Notice》 Linked to Kyle's airing schedule.",
      `kylevb Anime widget v${WIDGET_SCRIPT_VERSION}`,
    ]);
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null")).toEqual({ id: USER_ID, glass: false, name: "Kyle", artVersion: 1 });
    expect(fs.list(`${WIDGET_DIR}/art/`)).toHaveLength(15);
    expect(fs.list(`${WIDGET_DIR}/art/`).every((p) => !p.includes("-2x"))).toBe(true);
    expect(fs.list(`${WIDGET_DIR}/covers/`)).toHaveLength(3);
    expect(result.alerts[3].message).toContain("Kyle's airing schedule · …abcd");
  });

  it("says No list at that link on a 404 and saves nothing; offline it saves the link and says so", async () => {
    const fs = new MockFileSystem();
    const missing = await runScript({
      mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [link] },
      nowMs: NOW,
      net: siteNet({ status: 404, body: '{"schema":1,"error":"not-found"}' }),
      fs,
    });
    expect(missing.alerts.map((a) => a.title)).toEqual(["Link your list", "No list at that link"]);
    expect(fs.text(`${WIDGET_DIR}/config.json`)).toBeNull();
    const offline = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [link] }, nowMs: NOW, net: siteNet({ error: "offline" }), fs });
    expect(offline.alerts[1].title).toBe("Couldn't reach kylevb.com. The link is saved; widgets will try again.");
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null").id).toBe(USER_ID);
    const junk = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: ["hello"] }, "cancel"] }, nowMs: NOW, net, fs });
    expect(junk.alerts.map((a) => a.title)).toEqual(["Link your list", "That isn't a list link"]);
  });

  it("previews each family with the family passed explicitly", async () => {
    const fs = new MockFileSystem();
    await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [link, "cancel"] }, nowMs: NOW, net, fs });
    const labels = [
      ["Small", "presentSmall", "NEXT UP"],
      ["Medium", "presentMedium", "The whole week →"],
      ["Large", "presentLarge", "Kyle's airing schedule"],
      ["Lock Screen: Rectangular (estimated)", "presentAccessoryRectangular", "NEXT UP · EP 4"],
      ["Lock Screen: Inline (estimated)", "presentAccessoryInline", "Thu 7:30 AM PT · EP 4 · Frieren: Beyond Journey's End Season 2"],
      ["Lock Screen: Circular (estimated)", "presentAccessoryCircular", null],
    ] as const;
    for (const [label, method, text] of labels) {
      const alerts = label.startsWith("Lock") ? [{ choose: "Preview…" }, { choose: label }, "cancel" as const] : [{ choose: "Preview…" }, { choose: label }, { choose: "Night sky" }, "cancel" as const];
      const result = await runScript({ mode: { kind: "app", alerts }, nowMs: NOW + MIN, net, fs });
      expect(result.presented.map((p) => p.method)).toEqual([method]);
      if (text) expect(textsOf(result.presented[0].widget)).toContain(text);
      expect(result.quirks).toEqual([]);
    }
    const glass = await runScript({ mode: { kind: "app", alerts: [{ choose: "Preview…" }, { choose: "Medium" }, { choose: "Glass" }, "cancel"] }, nowMs: NOW + MIN, net, fs });
    expect(widgetProps(glass.presented[0].widget).backgroundColor).toBeUndefined();
  });

  it("Diagnostics lists the version, the art cache and each family's refresh gaps", async () => {
    const fs = new MockFileSystem();
    await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [link, "cancel"] }, nowMs: NOW, net, fs });
    for (const minutes of [0, 20, 40, 100]) await widgetRun("medium", { parameter: null, net, fs, nowMs: NOW + (5 + minutes) * MIN });
    const result = await runScript({ mode: { kind: "app", alerts: [{ choose: "Diagnostics" }, "cancel", "cancel"] }, nowMs: NOW + 2 * 60 * MIN, net, fs });
    const message = result.alerts[1].message;
    expect(result.alerts[1].title).toBe("Diagnostics");
    expect(message).toContain(`Script v${WIDGET_SCRIPT_VERSION} (latest v${WIDGET_SCRIPT_VERSION})`);
    expect(message).toContain(`List ${USER_ID} (Kyle)`);
    expect(message).toContain("Art v1 @3x: 15/15");
    expect(message).toMatch(/medium: 4 runs, median gap 20 min, longest 60 min, ok 4, slowest \d+ ms/);
  });

  it("opens the link prompt from kv=setup and fetches and reports from kv=refresh", async () => {
    const fs = new MockFileSystem();
    const setup = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: ["cancel"] }, nowMs: NOW, net, fs });
    expect(setup.alerts.map((a) => a.title)).toEqual(["Link your list"]);
    const refresh = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: ["cancel"] }, nowMs: NOW, net, fs });
    expect(refresh.alerts.map((a) => a.title)).toEqual(["《Notice》 Fetched. Saved Oct 15, 7:05 AM PT."]);
    expect(refresh.requests.map((r) => r.url)).toContain(DATA_URL);
    const offline = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: ["cancel"] }, nowMs: NOW, net: siteNet({ error: "x" }), fs });
    expect(offline.alerts.map((a) => a.title)).toEqual(["Couldn't reach kylevb.com."]);
  });

  it("names a newer script version in the menu only, never on a widget", async () => {
    const fs = new MockFileSystem();
    const newer = siteNet(edited("mixed", (p) => (p.script.latest = WIDGET_SCRIPT_VERSION + 1)));
    await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [link, "cancel"] }, nowMs: NOW, net: newer, fs });
    const menu = await runScript({ mode: { kind: "app", alerts: ["cancel"] }, nowMs: NOW, net: newer, fs });
    expect(menu.alerts[0].message).toContain(`A newer version (v${WIDGET_SCRIPT_VERSION + 1}) is on GitHub. Paste it over this script.`);
    for (const family of FAMILIES) {
      const { tree } = await widgetRun(family, { parameter: null, net: newer, fs, nowMs: NOW + 5 * MIN });
      expect(textsOf(tree).join(" ")).not.toMatch(/newer|GitHub/);
    }
  });

  it("calls Script.complete() exactly once on every path, including a thrown Alert", async () => {
    const thrown = await runScript({
      mode: { kind: "app", alerts: [] },
      nowMs: NOW,
      net,
      patch: (g) => {
        g.Alert.prototype.presentSheet = () => {
          throw new Error("sheet failed");
        };
      },
    });
    expect(thrown.completeCalls).toBe(1);
    expect(thrown.setWidgetCalls).toBe(0);
    expect(thrown.logs.some((l) => l.includes("sheet failed"))).toBe(true);
    for (const mode of [
      { kind: "app" as const, alerts: [] },
      { kind: "app" as const, queryParameters: { kv: "refresh" }, alerts: ["cancel" as const, "cancel" as const] },
    ]) {
      expect((await runScript({ mode, nowMs: NOW, net })).completeCalls).toBe(1);
    }
  });
});

describe("review fixes", () => {
  const net = siteNet(payloadAt("mixed"));
  const html404 = { status: 404, body: "<!DOCTYPE html><html><body>404: This page could not be found.</body></html>", mimeType: "text/html" };
  const html410 = { status: 410, body: "<html><body>Gone</body></html>", mimeType: "text/html" };

  it("keeps and shows the saved copy on an HTML 404 or 410 (a rollback, a platform page): only the API's JSON counts", async () => {
    for (const reply of [html404, html410]) {
      const fs = new MockFileSystem();
      await widgetRun("medium", { net, fs });
      const result = await widgetRun("medium", { net: siteNet(reply), fs, nowMs: NOW + 5 * MIN });
      expect(textsOf(result.tree)).toContain("Saved Oct 15, 7:05 AM PT");
      expect(textsOf(result.tree).join(" ")).not.toMatch(/No list at that link|Update this widget/);
      expect(fs.text(`${WIDGET_DIR}/data-${USER_ID}.json`)).not.toBeNull();
    }
    // Link my list during a rollback saves the link and says the site had a problem (it answered: the status shows).
    const fs = new MockFileSystem();
    const app = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }] }, nowMs: NOW, net: siteNet(html404), fs });
    expect(app.alerts[1].title).toBe("kylevb.com had a problem (HTTP 404). The link is saved; widgets will try again.");
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null").id).toBe(USER_ID);
  });

  it("says kylevb.com had a problem (not Couldn't reach) whenever the site answered: its own error, a platform page", async () => {
    const down = { status: 503, body: '{"schema":1,"error":"unavailable"}' };
    const none = await widgetRun("medium", { net: siteNet(down) });
    expect(textsOf(none.tree)).toEqual(expect.arrayContaining(["kylevb.com had a problem", "Your schedule appears after the next successful refresh. Tap to try again."]));
    expect(textsOf(none.tree).join(" ")).not.toContain("Couldn't reach");
    const fs = new MockFileSystem();
    await widgetRun("large", { net, fs });
    const saved = await widgetRun("large", { net: siteNet(down), fs, nowMs: NOW + 5 * MIN });
    expect(textsOf(saved.tree)).toContain("kylevb.com had a problem. Showing air times saved Oct 15, 7:05 AM PT.");
    const offline = await widgetRun("large", { net: siteNet({ error: "offline" }), fs, nowMs: NOW + 10 * MIN });
    expect(textsOf(offline.tree)).toContain("Couldn't reach kylevb.com. Showing air times saved Oct 15, 7:05 AM PT.");
    // An HTTP reply over HTTPS is normally kylevb.com's (a captive portal fails the TLS handshake: "network"; a
    // TLS-inspecting filter is the exception), so a platform page, a rate limit and an unreadable 2xx JSON say the
    // site had a problem; the app names each (HTTP N, or can't read).
    for (const reply of [
      { status: 502, body: "<html>Bad gateway</html>", mimeType: "text/html" },
      { status: 429, body: "Too Many Requests", mimeType: "text/plain" },
      { status: 200, body: '{"schema":1,"state":"party"}' },
    ]) {
      const page = await widgetRun("medium", { net: siteNet(reply) });
      expect(textsOf(page.tree), String(reply.status)).toContain("kylevb.com had a problem");
      expect(textsOf(page.tree).join(" "), String(reply.status)).not.toContain("Couldn't reach");
    }
    // A 2xx web page is never the route's (a filter or security profile the phone trusts answered): the schedule
    // didn't come from kylevb.com.
    const filtered = await widgetRun("medium", { net: siteNet({ status: 200, body: "<html>Blocked</html>", mimeType: "text/html" }) });
    expect(textsOf(filtered.tree)).toContain("Couldn't reach kylevb.com");
    const lines = async (reply: object) => {
      const app = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: [] }, nowMs: NOW, net: siteNet(reply) });
      return [app.alerts[0].title, app.alerts[0].message];
    };
    expect(await lines({ status: 502, body: "<html>Bad gateway</html>", mimeType: "text/html" })).toEqual(["kylevb.com had a problem (HTTP 502).", "Try again in a few minutes."]);
    expect(await lines(down)).toEqual(["kylevb.com had a problem (HTTP 503).", "Try again in a few minutes."]);
    expect(await lines({ status: 200, body: '{"schema":1,"state":"party"}' })).toEqual([
      "kylevb.com sent a reply this version of the script can't read.",
      "Try again in a few minutes. If it keeps happening, paste the newest version from GitHub.",
    ]);
    expect(await lines({ status: 200, body: "<html>Blocked by policy</html>", mimeType: "text/html" })).toEqual([
      "The reply wasn't kylevb.com's schedule: a web page came back instead.",
      "A network filter or security profile can do this. Try again in a few minutes, or on another network.",
    ]);
    // An empty 2xx is no web page: it can't be read.
    expect((await lines({ status: 200, body: "" }))[0]).toBe("kylevb.com sent a reply this version of the script can't read.");
    // Link my list gives the same advice after "The link is saved; widgets will try again."
    const link = async (reply: object) => {
      const app = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }] }, nowMs: NOW, net: siteNet(reply) });
      return [app.alerts[1].title, app.alerts[1].message];
    };
    expect(await link({ error: "offline" })).toEqual(["Couldn't reach kylevb.com. The link is saved; widgets will try again.", "Check this phone's connection."]);
    expect(await link({ status: 200, body: '{"schema":1,"state":"party"}' })).toEqual([
      "kylevb.com sent a reply this version of the script can't read. The link is saved; widgets will try again.",
      "If it keeps happening, paste the newest version from GitHub.",
    ]);
    expect(await link({ status: 200, body: "<html>Blocked by policy</html>", mimeType: "text/html" })).toEqual([
      "The reply wasn't kylevb.com's schedule: a web page came back instead. The link is saved; widgets will try again.",
      "A network filter or security profile can do this.",
    ]);
    expect(await link({ status: 503, body: '{"schema":1,"error":"unavailable"}' })).toEqual([
      "kylevb.com had a problem (HTTP 503). The link is saved; widgets will try again.",
      "",
    ]);
    // No answer at all (offline, or slower than the app's 8 s): nothing claims the phone is offline.
    for (const reply of [{ error: "offline" }, { status: 503, body: '{"schema":1,"error":"unavailable"}', latencyMs: 8150 }]) {
      expect(await lines(reply)).toEqual(["Couldn't reach kylevb.com.", "Check this phone's connection, or try again in a few minutes."]);
    }
  });

  it("never says Showing air times on a large saved copy that shows none; its card header carries the stamp", async () => {
    for (const scenario of ["empty-list", "nothing-scheduled", "resting"] as const) {
      const fs = new MockFileSystem();
      await widgetRun("large", { net: siteNet(payloadAt(scenario)), fs });
      const result = await widgetRun("large", { net: siteNet({ error: "offline" }), fs, nowMs: NOW + 5 * MIN });
      const texts = textsOf(result.tree);
      expect(texts.join(" "), scenario).not.toContain("Showing air times");
      expect(texts, scenario).toContain("Thought Acceleration: Kyle's week, computed in Pacific Time.");
      expect(texts, scenario).toContain("Saved Oct 15, 7:05 AM PT");
    }
  });

  it("counts refresh boundaries from the clock the rows were drawn at, however long the art and covers took", async () => {
    const at = NOW_S + 2;
    const payload = buildWidgetPayload({ userId: USER_ID, name: "Kyle", entries: [makeEntry({ id: 1, title: "Airs in 2 s", at, episode: 3, progress: 2 })], nowMs: NOW });
    const slowCover = siteNet(payload, { [payload.rows[0].cover as string]: { bytes: fakePng(230, 325), latencyMs: 2500 } });
    const result = await widgetRun("small", { net: slowCover });
    const refresh = widgetProps(result.tree).refreshAfterDate ?? 0;
    // Drawn as "soon" at NOW; its air-time boundary (at + 15 s) is before the 5-minute floor, so the floor wins.
    expect(refresh).toBeGreaterThanOrEqual(NOW + result.elapsedMs + 5 * MIN - 1);
    expect(refresh).toBeLessThan(NOW + result.elapsedMs + 5 * MIN + 1000);
  });

  it("shows the happy slime on a phone a few seconds behind the server, and doesn't pin the refresh to 5 minutes", async () => {
    const payload = payloadAt("mixed"); // generatedAt NOW, hungrySince NOW_S: already hungry
    const result = await widgetRun("medium", { net: siteNet(payload), nowMs: NOW - 5000 });
    expect(imageSrcs(result.tree)).toContain("https://kylevb.com/api/widget/art/slime-lord-happy.v1.png");
    // Its next boundary is row 0's drop (7:20:15), not "hungrySince" 5 minutes out.
    expect(widgetProps(result.tree).refreshAfterDate).toBe((1792072200 + 1800) * 1000 + 15_000);
  });

  it("explains the Parameter from a Parameter-caused state's tap, and after linking says the Parameter still wins", async () => {
    const fs = new MockFileSystem();
    const app = await runScript({
      mode: { kind: "app", queryParameters: { kv: "setup", from: "param", why: "missing" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] },
      nowMs: NOW,
      net,
      fs,
    });
    expect(app.alerts[0].message).toContain("That widget's Parameter field links to a list kylevb.com doesn't have.");
    expect(app.alerts[0].message).toContain("Edit Widget");
    // Words with no link ("glass mode"): the app says what the field takes, not that a link is broken.
    const words = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup", from: "param", why: "words" }, alerts: [] }, nowMs: NOW, net });
    expect(words.alerts[0].message).toContain("has words this widget doesn't use. It takes a list link, the word glass, or both.");
    expect(words.alerts[0].message).not.toContain("link that");
    // A Parameter list kylevb.com doesn't have, refreshed from the app (its Couldn't reach tap): Edit Widget, not a paste.
    const gone = await runScript({
      mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID, from: "param" }, alerts: [] },
      nowMs: NOW,
      net: siteNet({ status: 404, body: '{"schema":1,"error":"not-found"}' }),
    });
    expect(gone.alerts[0].message).toContain("Edit Widget");
    expect(gone.alerts[0].message).not.toContain("Copy it again");
    expect(app.alerts[1].title).toBe("《Notice》 Linked to Kyle's airing schedule.");
    expect(app.alerts[1].message).toContain("Parameter");
    // From the plain setup state, no Parameter talk.
    const plain = await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] }, nowMs: NOW, net, fs: new MockFileSystem() });
    expect(plain.alerts[0].message).toBe("Paste the link from Copy link on your Airing Schedule.");
    expect(plain.alerts[1].message).toBe("");
  });

  it("gives every network wait a wall-clock deadline: a reply that keeps trickling in never holds the run", async () => {
    // JSON: bytes keep arriving for 9 s (iOS's idle timeout never fires); the saved copy shows at the 5 s deadline.
    const fs = new MockFileSystem();
    await widgetRun("medium", { net, fs });
    const trickle = siteNet(payloadAt("mixed"), { [DATA_URL]: { body: JSON.stringify(payloadAt("mixed")), latencyMs: 9000, trickle: true } });
    const slow = await widgetRun("medium", { net: trickle, fs, nowMs: NOW + 5 * MIN });
    expect(dataRequests(slow)[0].abandoned).toBe(true);
    expect(slow.elapsedMs).toBeLessThanOrEqual(5000);
    expect(textsOf(slow.tree)).toContain("Saved Oct 15, 7:05 AM PT");
    // A cover trickling for 8 s: the run stops waiting at its image cap and draws the placeholder.
    const cover = payloadAt("mixed").rows[1].cover as string;
    const slowCover = siteNet(payloadAt("mixed"), { [cover]: { bytes: fakePng(230, 325), latencyMs: 8000, trickle: true } });
    const run = await widgetRun("small", { net: slowCover });
    expect(run.requests.find((r) => r.url === cover)?.abandoned).toBe(true);
    expect(run.elapsedMs).toBeLessThanOrEqual(5500);
    expect(nodesOf(run.tree, "stack").some(({ node }) => node.props.cornerRadius === 4 && node.children.length === 0)).toBe(true);
  });

  it("evicts old covers, never the payload's own", async () => {
    const fs = new MockFileSystem();
    const payload = payloadAt("mixed");
    await widgetRun("large", { net: siteNet(payload), fs });
    const own = fs.list(`${WIDGET_DIR}/covers/`);
    expect(own).toHaveLength(3);
    for (const path of own) fs.files.set(path, { ...fs.files.get(path)!, mtime: NOW - 1000 * MIN }); // the oldest
    for (let i = 0; i < 70; i++) {
      fs.files.set(`${WIDGET_DIR}/covers/${900000 + i}-00000000.img`, { bytes: fakePng(1, 1), mtime: NOW - (100 - i) * MIN, ctime: NOW, origin: null });
    }
    await widgetRun("large", { net: siteNet(payload), fs, nowMs: NOW + MIN });
    const left = fs.list(`${WIDGET_DIR}/covers/`);
    expect(left).toHaveLength(48);
    for (const path of own) expect(left).toContain(path);
  });

  it("draws the no-payload states with the newest art version a payload named", async () => {
    const fs = new MockFileSystem();
    const v2 = edited("mixed", (p) => (p.art.version = 2));
    await runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] }, nowMs: NOW, net: { ...siteNet(v2), ...artNet(2) }, fs });
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null").artVersion).toBe(2);
    const setup = await widgetRun("small", { parameter: "garbage", net: artNet(2), fs, nowMs: NOW + MIN });
    expect(imageSrcs(setup.tree)).toContain("https://kylevb.com/api/widget/art/slime-worried.v2.png");
    const gone = await widgetRun("medium", { net: { ...artNet(2), [DATA_URL]: { status: 404, body: '{"schema":1,"error":"not-found"}' } }, fs, nowMs: NOW + 2 * MIN });
    expect(imageSrcs(gone.tree)).toContain("https://kylevb.com/api/widget/art/slime-worried.v2.png");
    expect(gone.requests.filter((r) => r.url.includes(".v1.png"))).toEqual([]);
  });

  it("keeps a fixed gap before every timer", async () => {
    for (const family of ["medium", "large", "accessoryRectangular"] as const) {
      const { tree } = await widgetRun(family, { net });
      for (const { ancestors } of nodesOf(tree, "date")) {
        const line = ancestors[ancestors.length - 2];
        if (line.type !== "stack") throw new Error("no line");
        const box = line.children.length - 1;
        expect(line.children[box - 1]).toEqual({ type: "spacer", props: { length: 4 } });
      }
    }
  });

  it("draws dividers only between real rows (an empty slot is unruled)", async () => {
    const hairlines = (tree: WidgetNode) => nodesOf(tree, "stack").filter(({ node }) => node.props.size[1] === 1).length;
    const one = siteNet(payloadAt("one-row"));
    expect(hairlines((await widgetRun("medium", { net: one })).tree)).toBe(2); // header and footer lines
    expect(hairlines((await widgetRun("large", { net: one })).tree)).toBe(2);
    expect(hairlines((await widgetRun("medium", { net })).tree)).toBe(3);
    expect(hairlines((await widgetRun("large", { net })).tree)).toBe(4);
  });

  it("never draws art larger than its pixels, on any phone or iPad", async () => {
    for (const device of Object.values(DEVICE_PROFILES)) {
      for (const scenario of ["mixed", "empty-list", "nothing-scheduled"] as const) {
        for (const parameter of [LINK, `${LINK} glass`]) {
          for (const family of FAMILIES) {
            const { tree } = await widgetRun(family, { net: siteNet(payloadAt(scenario)), parameter, device });
            for (const { node } of nodesOf(tree, "image")) {
              const [w] = node.props.imageSize ?? [0];
              expect(w * device.scale, `${device.name} ${family} ${scenario} ${node.props.image.src}`).toBeLessThanOrEqual(node.props.image.w + 0.5);
            }
          }
        }
      }
    }
  });
});

describe("second review fixes", () => {
  const net = siteNet(payloadAt("mixed"));
  const OTHER_ID = "65f1c0ffee0123456789abce";
  const OTHER_LINK = `https://kylevb.com/user/${OTHER_ID}`;
  const OTHER_URL = `https://kylevb.com/api/widget/v1/list/${OTHER_ID}`;
  /** A second list (a friend's, shown through a widget's Parameter), with covers of its own. */
  const other = (version = 1) => {
    const payload = buildWidgetPayload({
      userId: OTHER_ID,
      name: "Mina",
      entries: [1, 2, 3].map((i) => makeEntry({ id: 410000 + i, title: `Other ${i}`, at: NOW_S + i * 3600, episode: i })),
      nowMs: NOW,
    });
    payload.art.version = version;
    return payload;
  };
  const otherNet = (payload: WidgetPayload, version = 1): NetTable => ({
    ...artNet(version),
    ...siteNet(payload),
    [OTHER_URL]: { body: JSON.stringify(payload), latencyMs: 120 },
  });
  const linkApp = (reply: NetTable, fs: MockFileSystem, nowMs = NOW) =>
    runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] }, nowMs, net: reply, fs });
  const junkCovers = (fs: MockFileSystem, from = 900000) => {
    for (let i = 0; i < 70; i++) {
      fs.files.set(`${WIDGET_DIR}/covers/${from + i}-00000000.img`, { bytes: fakePng(1, 1), mtime: NOW - (100 - i) * MIN, ctime: NOW, origin: null });
    }
  };

  it("never lets a slow sky cost the slime, or a slow cover blank another row (one timeline for parallel loads)", async () => {
    const payload = payloadAt("mixed");
    const skyUrl = "https://kylevb.com/api/widget/art/sky-large-3x.v1.png";
    for (const slow of [{ latencyMs: 9000, trickle: true }, { latencyMs: 9000 }]) {
      const fs = new MockFileSystem();
      const run = await widgetRun("large", { net: siteNet(payload, { [skyUrl]: { ...artNet()[skyUrl], ...slow } }), fs });
      expect(imageSrcs(run.tree), JSON.stringify(slow)).toContain("https://kylevb.com/api/widget/art/slime-lord-happy.v1.png");
      expect(widgetProps(run.tree).backgroundImage ?? null).toBeNull();
      const art = fs.list(`${WIDGET_DIR}/art/`).map((path) => path.split("/").pop());
      expect(art).toContain("slime-lord-happy.v1.png");
      expect(art).not.toContain("sky-large-3x.v1.png");
    }
    const covers = payload.rows.slice(0, 3).map((row) => row.cover as string);
    for (const [i, cover] of covers.entries()) {
      const run = await widgetRun("large", { net: siteNet(payload, { [cover]: { bytes: fakePng(230, 325), latencyMs: 8000, trickle: true } }) });
      const drawn = imageSrcs(run.tree).filter((src) => src.startsWith("https://s4.anilist.co/"));
      expect(drawn, `row ${i} slow`).toEqual(covers.filter((c) => c !== cover));
    }
  });

  it("never evicts another saved list's covers: a widget for another list, a state run and an in-app fetch keep them", async () => {
    const fs = new MockFileSystem();
    const a = payloadAt("mixed");
    const b = other();
    await widgetRun("large", { net: siteNet(a), fs });
    await widgetRun("large", { parameter: OTHER_LINK, net: otherNet(b), fs });
    const kept = fs.list(`${WIDGET_DIR}/covers/`);
    expect(kept).toHaveLength(6);
    for (const path of kept) fs.files.set(path, { ...fs.files.get(path)!, mtime: NOW - 1000 * MIN }); // the oldest downloads
    const runs: [string, () => Promise<unknown>][] = [
      ["list A's widget", () => widgetRun("large", { net: siteNet(a), fs, nowMs: NOW + MIN })],
      ["a state run", () => widgetRun("small", { parameter: "garbage", net: artNet(), fs, nowMs: NOW + 2 * MIN })],
      ["an in-app refresh of list A", () => runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: [] }, nowMs: NOW + 3 * MIN, net: siteNet(a), fs })],
    ];
    for (const [label, run] of runs) {
      junkCovers(fs);
      await run();
      const left = fs.list(`${WIDGET_DIR}/covers/`);
      expect(left.length, label).toBeLessThanOrEqual(48);
      for (const path of kept) expect(left, `${label}: ${path}`).toContain(path);
    }
  });

  it("evicts only after setWidget", async () => {
    const fs = new MockFileSystem();
    await widgetRun("large", { net, fs });
    junkCovers(fs);
    const events: string[] = [];
    await widgetRun("large", {
      net,
      fs,
      nowMs: NOW + MIN,
      patch: (g) => {
        const set = g.Script.setWidget.bind(g.Script);
        g.Script.setWidget = (w: unknown) => (events.push("setWidget"), set(w));
        const remove = g.FileManager.prototype.remove;
        g.FileManager.prototype.remove = function (path: string) {
          if (path.includes("/covers/")) events.push("remove");
          return remove.call(this, path);
        };
      },
    });
    expect(events[0]).toBe("setWidget");
    expect(events.filter((e) => e === "remove")).toHaveLength(73 - 48);
  });

  it("draws stored copies and states with the newest art version any payload named (another list's included)", async () => {
    const fs = new MockFileSystem();
    // A widget whose Parameter names list Y saves a v1 copy; then the in-app link of list X arrives at v2 (the v1 art
    // is dropped, and the server serves only v2).
    await widgetRun("medium", { parameter: OTHER_LINK, net: otherNet(other(1)), fs });
    const x2 = edited("mixed", (p) => (p.art.version = 2));
    await linkApp({ ...siteNet(x2), ...artNet(2) }, fs);
    expect(fs.list(`${WIDGET_DIR}/art/`).some((path) => path.includes(".v1."))).toBe(false);
    const runs: [string, NetTable, number][] = [
      ["Y's saved copy, offline", { ...artNet(2), [OTHER_URL]: { error: "offline" } }, NOW + 10 * MIN],
      ["Y unreachable, copy over 7 days old", { ...artNet(2), [OTHER_URL]: { error: "offline" } }, NOW + 8 * 86_400_000],
      ["Y gone", { ...artNet(2), [OTHER_URL]: { status: 404, body: '{"schema":1,"error":"not-found"}' } }, NOW + 20 * MIN],
    ];
    for (const [label, reply, nowMs] of runs) {
      const run = await widgetRun("medium", { parameter: OTHER_LINK, net: reply, fs, nowMs });
      expect(run.requests.filter((r) => r.url.includes(".v1.png")), label).toEqual([]);
      expect(imageSrcs(run.tree).some((src) => src.endsWith(".v2.png")), label).toBe(true);
    }
  });

  it("reads config.artVersion: a v2 payload saved with none of its art cached still draws the states at v2", async () => {
    const fs = new MockFileSystem();
    const v2 = edited("mixed", (p) => (p.art.version = 2));
    // The JSON lands after ART_BEFORE_MS: the run saves the v2 payload and fetches no art.
    const slow = await widgetRun("medium", { net: { ...artNet(1), ...artNet(2), ...siteNet(v2), [DATA_URL]: { body: JSON.stringify(v2), latencyMs: 2500 } }, fs });
    expect(slow.requests.filter((r) => r.url.includes("/api/widget/art/"))).toEqual([]);
    expect(fs.list(`${WIDGET_DIR}/art/`)).toEqual([]);
    const bad = await widgetRun("small", { parameter: "garbage", net: { ...artNet(1), ...artNet(2) }, fs, nowMs: NOW + MIN });
    expect(imageSrcs(bad.tree)).toContain("https://kylevb.com/api/widget/art/slime-worried.v2.png");
    expect(bad.requests.filter((r) => r.url.includes(".v1.png"))).toEqual([]);
  });

  it("stops waiting for a trickling cover at the 3 s image cap, not the run budget", async () => {
    const cover = payloadAt("mixed").rows[1].cover as string;
    let startedAt = 0;
    const slowCover = siteNet(payloadAt("mixed"), {
      [cover]: () => ((startedAt = Date.now()), { bytes: fakePng(230, 325), latencyMs: 8000, trickle: true }),
    });
    const run = await widgetRun("small", { net: slowCover });
    expect(run.requests.find((r) => r.url === cover)?.abandoned).toBe(true);
    expect(NOW + run.elapsedMs - startedAt).toBe(3000);
  });

  it("gives in-app downloads their own cap: a slow but steady link still caches every art file", async () => {
    const fs = new MockFileSystem();
    const slowArt = Object.fromEntries(Object.entries(artNet()).map(([url, reply]) => [url, { ...reply, latencyMs: 4000, trickle: true }]));
    const app = await linkApp({ ...siteNet(payloadAt("mixed")), ...slowArt }, fs);
    expect(app.alerts[1].message).toBe("");
    expect(fs.list(`${WIDGET_DIR}/art/`)).toHaveLength(15);
    // Art that never arrives: the link is saved, and the alert says the pictures come later.
    const missing = await linkApp({ ...siteNet(payloadAt("mixed")), ...Object.fromEntries(Object.keys(artNet()).map((url) => [url, { status: 404, body: "" }])) }, new MockFileSystem());
    expect(missing.alerts[1].title).toBe("《Notice》 Linked to Kyle's airing schedule.");
    expect(missing.alerts[1].message).toContain("Some pictures didn't finish downloading.");
  });

  it("never labels a newly linked list with the previous list's name in Diagnostics", async () => {
    const fs = new MockFileSystem();
    await linkApp(net, fs);
    const relink = await runScript({
      mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [OTHER_LINK] }, "cancel"] },
      nowMs: NOW + MIN,
      net: { ...artNet(), [OTHER_URL]: { error: "offline" } },
      fs,
    });
    expect(relink.alerts[1].title).toBe("Couldn't reach kylevb.com. The link is saved; widgets will try again.");
    const diagnostics = async (nowMs: number) =>
      (await runScript({ mode: { kind: "app", alerts: [{ choose: "Diagnostics" }, "cancel", "cancel"] }, nowMs, fs })).alerts[1].message ?? "";
    expect(await diagnostics(NOW + 2 * MIN)).toContain(`List ${OTHER_ID}\n`);
    // Once a widget run saves the new list, Diagnostics names its owner.
    await widgetRun("medium", { parameter: null, net: otherNet(other()), fs, nowMs: NOW + 3 * MIN });
    expect(await diagnostics(NOW + 4 * MIN)).toContain(`List ${OTHER_ID} (Mina)`);
  });

  it("keeps a fixed gap before the card header's note, a saved copy's stamp included", async () => {
    const savedRun = async (family: "medium" | "large", scenario: Scenario) => {
      const fs = new MockFileSystem();
      await widgetRun(family, { net: siteNet(payloadAt(scenario)), fs });
      return (await widgetRun(family, { net: siteNet({ error: "offline" }), fs, nowMs: NOW + 5 * MIN })).tree;
    };
    const trees = [(await widgetRun("medium", { net })).tree, await savedRun("medium", "mixed"), await savedRun("large", "empty-list")];
    const notes: string[] = [];
    for (const tree of trees) {
      const title = nodesOf(tree, "text").find(({ node }) => node.props.text === "Next episodes");
      if (!title) throw new Error("no header");
      const header = title.ancestors[title.ancestors.length - 1];
      if (header.type !== "stack") throw new Error("no header");
      const i = header.children.indexOf(title.node);
      // "Next episodes" never scales (SwiftUI sizes the least flexible text first: it would get its full width anyway).
      expect(title.node.props.minimumScaleFactor).toBe(1);
      expect(header.children.slice(i + 1, i + 3)).toEqual([
        { type: "spacer", props: { length: null } },
        { type: "spacer", props: { length: 4 } },
      ]);
      const note = header.children[i + 3];
      expect(note.type).toBe("text");
      if (note.type === "text") {
        notes.push(note.props.text);
        expect(note.props.minimumScaleFactor, note.props.text).toBe(note.props.text === "Pacific Time" ? 1 : 0.75);
      }
    }
    expect(notes).toEqual(["Pacific Time", "Saved Oct 15, 7:05 AM PT", "Pacific Time"]);
    // The large saved state keeps the card's own header; its stamp has a full-width row of its own.
    const large = trees[2];
    expect(textsOf(large)).toEqual(expect.arrayContaining(["Pacific Time", "Saved Oct 15, 7:05 AM PT"]));
    const stamp = nodesOf(large, "text").find(({ node }) => node.props.text === "Saved Oct 15, 7:05 AM PT")!;
    const row = stamp.ancestors[stamp.ancestors.length - 1];
    expect(row.type === "stack" && row.children.filter((c) => c.type === "text")).toHaveLength(1);
    expect(stamp.node.props).toMatchObject({ lineLimit: 1, minimumScaleFactor: 0.75 });
  });
});

describe("third review fixes", () => {
  const net = siteNet(payloadAt("mixed"));
  const OTHER_ID = "65f1c0ffee0123456789abce";
  const OTHER_LINK = `https://kylevb.com/user/${OTHER_ID}`;
  const OTHER_URL = `https://kylevb.com/api/widget/v1/list/${OTHER_ID}`;
  const other = (version = 1) => {
    const payload = buildWidgetPayload({
      userId: OTHER_ID,
      name: "Mina",
      entries: [1, 2, 3].map((i) => makeEntry({ id: 410000 + i, title: `Other ${i}`, at: NOW_S + i * 3600, episode: i })),
      nowMs: NOW,
    });
    payload.art.version = version;
    return payload;
  };
  const otherNet = (payload: WidgetPayload, version = 1): NetTable => ({
    ...artNet(version),
    ...siteNet(payload),
    [OTHER_URL]: { body: JSON.stringify(payload), latencyMs: 120 },
  });
  const linkApp = (reply: NetTable, fs: MockFileSystem, nowMs = NOW) =>
    runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] }, nowMs, net: reply, fs });
  const art = (fs: MockFileSystem) => fs.list(`${WIDGET_DIR}/art/`).map((path) => path.split("/").pop());
  const ART = "https://kylevb.com/api/widget/art/";

  it("draws a stored copy offline with its own cached art when another list's widget saw an art bump", async () => {
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/config.json`, { bytes: new TextEncoder().encode(JSON.stringify({ id: USER_ID })), mtime: NOW, ctime: NOW, origin: null });
    // List Y (a widget's Parameter) is drawn at v1 on a small widget; then list X's medium widget gets a v2 payload.
    await widgetRun("small", { parameter: OTHER_LINK, net: otherNet(other(1)), fs });
    expect(art(fs)).toEqual(["sky-small-3x.v1.png", "slime-demon-happy.v1.png"]);
    const x2 = edited("mixed", (p) => (p.art.version = 2));
    await widgetRun("medium", { parameter: null, net: { ...siteNet(x2), ...artNet(2) }, fs, nowMs: NOW + MIN });
    expect(art(fs)).toEqual(expect.arrayContaining(["sky-medium-3x.v2.png", "slime-lord-happy.v2.png"]));
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null").artVersion).toBe(2);
    // Offline, Y's widget draws its saved copy (and, a week on, its unreachable state) with the art it has.
    for (const [label, nowMs] of [["saved copy", NOW + 10 * MIN], ["unreachable", NOW + 8 * 86_400_000]] as const) {
      const run = await widgetRun("small", { parameter: OTHER_LINK, net: { [OTHER_URL]: { error: "offline" } }, fs, nowMs });
      expect(widgetProps(run.tree).backgroundImage?.src, label).toBe(`${ART}sky-small-3x.v1.png`);
      // The saved copy's own slime is cached at v1; the state's worried slime never was, in any version.
      if (label === "saved copy") expect(imageSrcs(run.tree)).toContain(`${ART}slime-demon-happy.v1.png`);
    }
    // Online inside the fetch window, the current version is fetched and drawn.
    const online = await widgetRun("small", { parameter: OTHER_LINK, net: otherNet(other(2), 2), fs, nowMs: NOW + 20 * MIN });
    expect(widgetProps(online.tree).backgroundImage?.src).toBe(`${ART}sky-small-3x.v2.png`);
  });

  it("asks for the remembered version first: a partial v1 cache never wins over v2 for the states", async () => {
    const fs = new MockFileSystem();
    await widgetRun("small", { net, fs });
    const v2 = edited("mixed", (p) => (p.art.version = 2));
    // Past the 90 s fresh window, so this run fetches; its JSON lands after ART_BEFORE_MS, so no v2 art is cached.
    await widgetRun("medium", { net: { ...artNet(1), ...artNet(2), ...siteNet(v2), [DATA_URL]: { body: JSON.stringify(v2), latencyMs: 2500 } }, fs, nowMs: NOW + 2 * MIN });
    expect(art(fs).some((name) => name?.includes(".v2."))).toBe(false);
    const gone = await widgetRun("medium", { net: { ...artNet(1), ...artNet(2), [DATA_URL]: { status: 404, body: '{"schema":1,"error":"not-found"}' } }, fs, nowMs: NOW + 4 * MIN });
    expect(imageSrcs(gone.tree)).toContain(`${ART}slime-worried.v2.png`);
    expect(gone.requests.filter((r) => r.url.includes(".v1.png"))).toEqual([]);
  });

  it("saves the link before the pictures download, and downloads art and covers side by side", async () => {
    const fs = new MockFileSystem();
    const seen: Record<string, { at: number; id: string | null }> = {};
    const watch = (url: string, reply: object) => () => {
      seen[url] = { at: Date.now(), id: JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "{}").id ?? null };
      return { ...reply, latencyMs: 30_000, trickle: true };
    };
    const payload = payloadAt("mixed");
    const slow: NetTable = { ...siteNet(payload) };
    const firstArt = `${ART}slime-worried.v1.png`;
    const firstCover = payload.rows[0].cover as string;
    slow[firstArt] = watch(firstArt, artNet()[firstArt] as object);
    slow[firstCover] = watch(firstCover, { bytes: fakePng(230, 325) });
    const app = await linkApp(slow, fs);
    expect(seen[firstArt].id).toBe(USER_ID);
    expect(seen[firstCover].at).toBe(seen[firstArt].at);
    // One image cap of silence (20 s), not one for the art and another for the covers.
    expect(app.elapsedMs).toBe(120 + 20_000);
    expect(app.alerts[1].title).toBe("《Notice》 Linked to Kyle's airing schedule.");
  });

  it("caps an in-app image at 20 s, with an 8 s idle timeout, and Refresh now says when art is missing", async () => {
    // A file trickling for 30 s is dropped at 20 s from its own start; the other 14 are cached.
    const fs = new MockFileSystem();
    let startedAt = 0;
    const file = `${ART}slime-worried.v1.png`;
    const trickling = { ...siteNet(payloadAt("mixed")), [file]: () => ((startedAt = Date.now()), { ...(artNet()[file] as object), latencyMs: 30_000, trickle: true }) };
    const app = await linkApp(trickling, fs);
    expect(app.requests.find((r) => r.url === file)?.abandoned).toBe(true);
    expect(NOW + app.elapsedMs - startedAt).toBe(20_000);
    expect(art(fs)).toHaveLength(14);
    expect(app.alerts[1].message).toContain("Some pictures didn't finish downloading.");
    // A server that takes 5 s to start answering still delivers (idle timeout 8 s, not the widget's 3 s).
    const late = await linkApp({ ...siteNet(payloadAt("mixed")), ...artNet(1, 5000) }, new MockFileSystem());
    expect(late.alerts[1].message).toBe("");
    expect(late.requests.filter((r) => r.url.startsWith(ART)).every((r) => r.timeoutInterval === 8)).toBe(true);
    // Refresh now with no art to be had says so too.
    const missing = Object.fromEntries(Object.keys(artNet()).map((url) => [url, { status: 404, body: "" }]));
    const refresh = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: [] }, nowMs: NOW, net: { ...siteNet(payloadAt("mixed")), ...missing } });
    expect(refresh.alerts[0].message).toContain("Some pictures didn't finish downloading.");
  });

  it("taps from every Parameter-caused state carry from=param; the in-app link's states don't", async () => {
    const unavailable = await widgetRun("medium", { net: siteNet({ status: 500, body: '{"schema":1,"error":"unavailable"}' }) });
    expect(widgetProps(unavailable.tree).url).toBe(`scriptable:///run/kylevb-anime?kv=refresh&id=${USER_ID}&from=param`);
    const fs = new MockFileSystem();
    fs.dirs.add(WIDGET_DIR);
    fs.files.set(`${WIDGET_DIR}/config.json`, { bytes: new TextEncoder().encode(JSON.stringify({ id: USER_ID })), mtime: NOW, ctime: NOW, origin: null });
    const linked = await widgetRun("medium", { parameter: null, fs, net: siteNet({ error: "offline" }) });
    expect(widgetProps(linked.tree).url).toBe(`scriptable:///run/kylevb-anime?kv=refresh&id=${USER_ID}`);
    const notFound = siteNet({ status: 404, body: '{"schema":1,"error":"not-found"}' });
    const plain = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: [] }, nowMs: NOW, net: notFound });
    expect(plain.alerts[0].message).toBe("kylevb.com found no list at that link. Copy it again from your Airing Schedule.");
    const param = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID, from: "param" }, alerts: [] }, nowMs: NOW, net: notFound });
    expect(param.alerts[0].message.startsWith("That widget's Parameter field links to a list kylevb.com doesn't have.")).toBe(true);
  });

  it("tells a link that isn't a list link from words, and accepts a link wrapped in punctuation", async () => {
    const cut = await widgetRun("medium", { parameter: `https://kylevb.com/user/${USER_ID.slice(0, 20)}`, net: artNet() });
    expect(widgetProps(cut.tree).url).toBe(`${SETUP_URL}&from=param&why=link`);
    const prompt = async (why: string) =>
      (await runScript({ mode: { kind: "app", queryParameters: { kv: "setup", from: "param", why }, alerts: [] }, nowMs: NOW, net })).alerts[0].message ?? "";
    expect(await prompt("link")).toContain("has a link that isn't a list link: it may be cut off, or for another page.");
    expect(await prompt("link")).not.toContain("words");
    expect(await prompt("party")).toContain("That widget's Parameter field needs a change.");
    for (const inherited of ["constructor", "toString", "__proto__"]) expect(await prompt(inherited), inherited).toContain("needs a change.");
    for (const parameter of [`(${LINK})`, `<${LINK}>`, `${LINK}.`, `"${LINK}", glass`]) {
      const run = await widgetRun("medium", { parameter, net });
      expect(textsOf(run.tree), parameter).toContain("Next episodes");
    }
    // After linking from a widget whose Parameter has no list, that widget keeps its warning: the app says so.
    const words = await runScript({
      mode: { kind: "app", queryParameters: { kv: "setup", from: "param", why: "words" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] },
      nowMs: NOW,
      net,
      fs: new MockFileSystem(),
    });
    expect(words.alerts[1].message).toBe("That widget keeps its warning until its Parameter is fixed: touch and hold it, then Edit Widget.");
  });

  it("lets a saved list's covers go once its copy is over 7 days old", async () => {
    const junk = (fs: MockFileSystem) => {
      for (let i = 0; i < 70; i++) {
        fs.files.set(`${WIDGET_DIR}/covers/${900000 + i}-00000000.img`, { bytes: fakePng(1, 1), mtime: NOW - (100 - i) * MIN, ctime: NOW, origin: null });
      }
    };
    for (const [days, keeps] of [
      [6, true],
      [8, false],
    ] as const) {
      const fs = new MockFileSystem();
      const a = payloadAt("mixed");
      await widgetRun("large", { net: siteNet(a), fs });
      await widgetRun("large", { parameter: OTHER_LINK, net: otherNet(other()), fs });
      const bCovers = fs.list(`${WIDGET_DIR}/covers/`).filter((path) => /\/41000\d-/.test(path));
      expect(bCovers).toHaveLength(3);
      for (const path of fs.list(`${WIDGET_DIR}/covers/`)) fs.files.set(path, { ...fs.files.get(path)!, mtime: NOW - 1000 * MIN });
      junk(fs);
      // A state run (no downloads) evicts, `days` later.
      await widgetRun("small", { parameter: "garbage", net: artNet(), fs, nowMs: NOW + days * 86_400_000 });
      const left = fs.list(`${WIDGET_DIR}/covers/`);
      for (const path of bCovers) expect(left.includes(path), `${days} days: ${path}`).toBe(keeps);
    }
  });
});

describe("on a phone", () => {
  it("saves over its own files: iOS's move never replaces one, so the old file goes first (seen on a phone)", async () => {
    const fs = new MockFileSystem();
    const net = siteNet(payloadAt("mixed"));
    const data = `${WIDGET_DIR}/data-${USER_ID}.json`;
    await widgetRun("medium", { net, fs });
    const first = JSON.parse(fs.text(data) ?? "null").savedAt;
    // Past the 90 s fresh window: the second run fetches and saves the copy, config.json and the run log again.
    const again = await widgetRun("medium", { net: siteNet(edited("mixed", (p) => (p.art.version = 2))), fs, nowMs: NOW + 2 * MIN });
    expect(textsOf(again.tree)).toContain("Next episodes");
    expect(JSON.parse(fs.text(data) ?? "null").savedAt).toBeGreaterThan(first);
    expect(JSON.parse(fs.text(`${WIDGET_DIR}/config.json`) ?? "null").artVersion).toBe(2);
    const runs = JSON.parse(fs.text(`${WIDGET_DIR}/runs.json`) ?? "[]");
    expect(runs.map((r: { out: string }) => r.out)).toEqual(["ok", "ok"]);
    expect(runs.some((r: { err?: string }) => r.err)).toBe(false);
    expect(fs.list(`${WIDGET_DIR}/`).filter((path) => path.endsWith(".tmp"))).toEqual([]);
  });
});

describe("fourth review fixes", () => {
  const ART = "https://kylevb.com/api/widget/art/";
  const art = (fs: MockFileSystem) => fs.list(`${WIDGET_DIR}/art/`).map((path) => path.split("/").pop() as string);
  const linkApp = (reply: NetTable, fs: MockFileSystem, nowMs = NOW) =>
    runScript({ mode: { kind: "app", queryParameters: { kv: "setup" }, alerts: [{ choose: "Link", fields: [LINK] }, "cancel"] }, nowMs, net: reply, fs });
  const failing = (version: number) => Object.fromEntries(Object.keys(artNet(version)).map((url) => [url, { status: 404, body: "" }]));

  it("caps the in-app JSON at 8 s of wall clock: a reply that keeps trickling in never holds Refresh now or Link", async () => {
    const trickle = siteNet(payloadAt("mixed"), { [DATA_URL]: { body: JSON.stringify(payloadAt("mixed")), latencyMs: 30_000, trickle: true } });
    const refresh = await runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: [] }, nowMs: NOW, net: trickle });
    expect(dataRequests(refresh)[0].abandoned).toBe(true);
    expect(refresh.elapsedMs).toBe(8000);
    expect(refresh.alerts[0].title).toBe("Couldn't reach kylevb.com.");
    const link = await linkApp(trickle, new MockFileSystem());
    expect(dataRequests(link)[0].abandoned).toBe(true);
    expect(link.elapsedMs).toBe(8000);
    expect(link.alerts[1].title).toBe("Couldn't reach kylevb.com. The link is saved; widgets will try again.");
  });

  it("falls back to the same picture only (never its -happy sibling) and to its newest cached version", async () => {
    const fs = new MockFileSystem();
    const calm = (version: number) => edited("mixed", (p) => ((p.hungrySince = null), (p.art.version = version)));
    // v1 calm, then v2 hungry past the fresh window: sky-medium-3x.v1/.v2, slime-lord.v1, slime-lord-happy.v2.
    await widgetRun("medium", { net: { ...siteNet(calm(1)), ...artNet(1) }, fs });
    await widgetRun("medium", { net: { ...siteNet(edited("mixed", (p) => (p.art.version = 2))), ...artNet(2) }, fs, nowMs: NOW + 2 * MIN });
    expect(art(fs).sort()).toEqual(["sky-medium-3x.v1.png", "sky-medium-3x.v2.png", "slime-lord-happy.v2.png", "slime-lord.v1.png"]);
    // A calm v3 copy whose JSON lands after the art window, then the same copy offline.
    const late = await widgetRun("medium", { net: { ...artNet(3), [DATA_URL]: { body: JSON.stringify(calm(3)), latencyMs: 2500 } }, fs, nowMs: NOW + 4 * MIN });
    const offline = await widgetRun("medium", { net: { [DATA_URL]: { error: "offline" } }, fs, nowMs: NOW + 10 * MIN });
    for (const [label, run] of [["late", late], ["offline", offline]] as const) {
      expect(widgetProps(run.tree).backgroundImage?.src, label).toBe(`${ART}sky-medium-3x.v2.png`);
      expect(imageSrcs(run.tree).filter((src) => src.includes("/slime-")), label).toEqual([`${ART}slime-lord.v1.png`]);
    }
  });

  it("keeps a picture's older version when an in-app Link or Refresh couldn't download its new one", async () => {
    const fs = new MockFileSystem();
    await linkApp({ ...siteNet(payloadAt("mixed")), ...artNet(1) }, fs);
    expect(art(fs)).toHaveLength(15);
    const v2 = edited("mixed", (p) => (p.art.version = 2));
    const refresh = (net: NetTable, nowMs: number) =>
      runScript({ mode: { kind: "app", queryParameters: { kv: "refresh", id: USER_ID }, alerts: [] }, nowMs, net, fs });
    // Refresh now gets the v2 payload but none of its art: every v1 file stays for the fallback.
    await refresh({ ...siteNet(v2), ...failing(2) }, NOW + 2 * MIN);
    expect(art(fs).filter((name) => name.endsWith(".v1.png"))).toHaveLength(15);
    const offline = await widgetRun("medium", { net: { [DATA_URL]: { error: "offline" } }, fs, nowMs: NOW + 10 * MIN });
    expect(widgetProps(offline.tree).backgroundImage?.src).toBe(`${ART}sky-medium-3x.v1.png`);
    expect(imageSrcs(offline.tree)).toContain(`${ART}slime-lord-happy.v1.png`);
    // Once v2 arrives, its older versions go.
    await refresh({ ...siteNet(v2), ...artNet(2) }, NOW + 20 * MIN);
    expect(art(fs).every((name) => name.endsWith(".v2.png"))).toBe(true);
    expect(art(fs)).toHaveLength(15);
  });
});

describe("every family fits every phone and iPad (summed from the drawn tree)", () => {
  /** A node's minimum height in points: fixed sizes and spacers, ≈ 1.2 × font size a text line, padding included. */
  function minHeight(node: WidgetNode, axis: "v" | "h"): number {
    if (node.type === "spacer") return axis === "v" ? (node.props.length ?? 0) : 0;
    if (node.type === "text" || node.type === "date") {
      const size = Number(/\((\d+(?:\.\d+)?)\)/.exec(node.props.font)?.[1] ?? 17);
      const lines = node.type === "text" && node.props.lineLimit > 1 ? node.props.lineLimit : 1;
      return 1.2 * size * lines * (node.props.minimumScaleFactor < 1 ? node.props.minimumScaleFactor : 1);
    }
    if (node.type === "image") return node.props.imageSize?.[1] ?? 0;
    const children = node.children;
    const pad = node.type === "stack" ? node.props.padding : node.props.padding === "default" ? [16, 16, 16, 16] : node.props.padding;
    const padV = pad ? pad[0] + pad[2] : 0;
    if (node.type === "stack" && node.props.size[1] > 0) return node.props.size[1];
    const layout = node.type === "widget" ? "v" : node.props.layout;
    const inner = layout === "v" ? children.reduce((sum, c) => sum + minHeight(c, "v"), 0) : Math.max(0, ...children.map((c) => minHeight(c, "h")));
    return inner + padV;
  }

  /** Every fixed-height stack whose contents (summed in a column, the tallest in a row, plus padding) don't fit. */
  function overflows(node: WidgetNode, out: string[] = []): string[] {
    if (node.type === "stack" && node.props.size[1] > 0) {
      const pad = node.props.padding ? node.props.padding[0] + node.props.padding[2] : 0;
      const inner =
        node.props.layout === "v"
          ? node.children.reduce((sum, c) => sum + minHeight(c, "v"), 0)
          : Math.max(0, ...node.children.map((c) => minHeight(c, "h")));
      if (inner + pad > node.props.size[1] + 0.5) out.push(`${(inner + pad).toFixed(1)} in ${node.props.size[1]}`);
    }
    if ("children" in node) for (const child of node.children) overflows(child, out);
    return out;
  }

  it("leaves at least 4 pt of the widget's height on every device class, and overfills no fixed-height stack", async () => {
    const S = (await scriptExports()) as any;
    const devices = [
      ...Object.values(DEVICE_PROFILES),
      { name: "iPad mini", screen: [744, 1133], scale: 2 },
      { name: "iPad 10.2-inch", screen: [810, 1080], scale: 2 },
      { name: "iPad Pro 13-inch", screen: [1032, 1376], scale: 2 },
    ] as const;
    for (const device of devices) {
      const pad = device.name.startsWith("iPad");
      const row = S.sizeRow({ width: device.screen[0], height: device.screen[1] }, pad) as number[];
      const heights: Record<string, number> = { small: row[2], medium: row[2], large: row[4], accessoryRectangular: row[6] };
      for (const scenario of ["mixed", "premiere-unknown-long", "empty-list", "resting"] as const) {
        for (const family of ["small", "medium", "large", "accessoryRectangular"] as const) {
          const { tree } = await widgetRun(family, { net: siteNet(payloadAt(scenario)), device: device as never });
          const used = minHeight(tree, "v");
          expect(heights[family] - used, `${device.name} ${family} ${scenario}: ${used.toFixed(1)} of ${heights[family]}`).toBeGreaterThanOrEqual(4);
          expect(overflows(tree), `${device.name} ${family} ${scenario}`).toEqual([]);
        }
      }
    }
  });
});
