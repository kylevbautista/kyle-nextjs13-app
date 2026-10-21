import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import colors from "tailwindcss/colors";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/components/home/skyArt";
import { SLIME_COLORS } from "@/components/home/slimeArt";
import { OG_SKY_GRADIENT } from "@/components/og/OgSky";
import { WIDGET_FALLBACK_COPY, widgetCopy } from "@/lib/anime/widgetCopy";
import { AIRED_GRACE_SECONDS, visibleAiring } from "@/lib/landing";
import { airingSchedulePath, myListPath, widgetArtPath, widgetListPath } from "@/lib/routes";
import { CANONICAL_ID_RE } from "@/server/lib/userList";
import {
  WIDGET_FRESH_MS,
  WIDGET_ORIGIN,
  WIDGET_REFRESH,
  WIDGET_SAVED_MAX_AGE_MS,
  WIDGET_SCHEMA,
  WIDGET_SCRIPT_VERSION,
  WIDGET_SOON_SECONDS,
  WIDGET_TIMER_SECONDS,
  parseWidgetParameter,
  pickWidgetRows,
  toWidgetRow,
  widgetIsHungry,
  widgetNextRefreshMs,
  widgetRowLines,
  widgetRowPhase,
  widgetTickerRow,
  type WidgetOutcome,
  type WidgetPayload,
  type WidgetRow,
} from "@/lib/widget";
import { WIDGET_ART_NAMES, WIDGET_ART_VERSION, widgetArtFile } from "@/lib/widgetArt";
import { realmOnlyGlobals, runScript, scriptExports } from "./harness";
import { NOW, NOW_S, USER_ID, makeEntry, payloadAt, type Scenario } from "./fixtures";

const S = (await scriptExports()) as Record<string, any>;

const COPY = { sep: " · ", aired: "Aired", ticker: "Next up" } as const;
const rand = mulberry32(20261015);
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];

/** A random schedule: `n` entries around NOW (some aired, some days out), as real rows. */
function randomRows(n: number) {
  const entries = Array.from({ length: n }, (_, i) =>
    makeEntry({ id: 1000 + i, title: `Show ${i}`, at: NOW_S + Math.round((rand() - 0.3) * 3 * 86_400), episode: 1 + Math.floor(rand() * 20), episodes: 30 })
  ).sort((a, b) => (a.upComingAirDate.episode[0].airingAt ?? 0) - (b.upComingAirDate.episode[0].airingAt ?? 0));
  return { entries, rows: entries.map((e) => toWidgetRow(e, USER_ID, NOW)) };
}

describe("the script's rules equal lib/widget.ts's", () => {
  it("rowPhase matches widgetRowPhase at every boundary", () => {
    const offsets: number[] = [];
    for (let s = -86_400; s <= 172_800; s += 450) offsets.push(s);
    for (const edge of [-1800, 0, 3600, 86_400]) offsets.push(edge - 1, edge - 0.5, edge, edge + 0.5, edge + 1);
    for (const offset of offsets) {
      const nowMs = NOW - offset * 1000 + 0.25;
      expect(S.rowPhase(NOW_S, nowMs), String(offset)).toBe(widgetRowPhase(NOW_S, nowMs));
    }
  });

  it("pickRows keeps exactly what visibleAiring keeps, and tickerRow matches widgetTickerRow", () => {
    for (let round = 0; round < 500; round++) {
      const { entries, rows } = randomRows(1 + Math.floor(rand() * 12));
      const nowMs = NOW + Math.round((rand() - 0.2) * 2 * 86_400_000);
      const count = 1 + Math.floor(rand() * 8);
      const expected = visibleAiring(entries, nowMs, count).map((e) => e.id);
      expect(S.pickRows(rows, nowMs, count).map((r: WidgetRow) => r.id)).toEqual(expected);
      expect(pickWidgetRows(rows, nowMs, count).map((r) => r.id)).toEqual(expected);
      expect(S.tickerRow(rows, nowMs)).toEqual(widgetTickerRow(rows, nowMs));
    }
  });

  it("rowLines matches widgetRowLines", () => {
    const rows = payloadAt("mixed").rows.concat(payloadAt("premiere-unknown-long").rows);
    for (const row of rows) {
      for (const phase of ["far", "day", "soon", "aired"] as const) {
        expect(S.rowLines(row, phase, COPY)).toEqual(widgetRowLines(row, phase, COPY));
      }
    }
  });

  it("parseParameter matches parseWidgetParameter", () => {
    const id = USER_ID;
    const other = "65f000000000000000000002";
    const legacy = Buffer.from("kyle@example.com").toString("base64url");
    const inputs: unknown[] = [
      new URL(myListPath(id), "https://kylevb.com").href,
      `kylevb.com${myListPath(id)}`,
      `kylevb.com${airingSchedulePath(id)}`,
      `https://kyle-git-branch.vercel.app/user/${id}`,
      `https://kylevb.com${airingSchedulePath(id)}?day=all`,
      `https://kylevb.com${airingSchedulePath(id)}#schedule-panel`,
      id,
      id.toUpperCase(),
      ` ${id} `,
      `glass ${id}`,
      `${id} glass`,
      `${id},glass`,
      `${id};GLASS`,
      "glass",
      "GLASS glass",
      `${id} ${other}`,
      `${other}, ${id}`,
      `https://kylevb.com/user/${legacy}`,
      `/user/${legacy}`,
      `${id}0`,
      `x${id}`,
      `https://kylevb.com/anime/${id}`,
      "hello world",
      "",
      "   ",
      null,
      undefined,
      42,
      { id },
      `https://kylevb.com/user/${id}/extra`,
      `https://kylevb.com/user/${id}&x`,
      `kylevb.com/mylist/${id}?day=thu glass`,
      "https://kylevb.com/user/",
      "65f1",
      `HTTPS://KYLEVB.COM/USER/${id.toUpperCase()}`,
      `\t${id}\n`,
      `${id};;;`,
      `,${id},`,
      "glass;",
      `${id} please glass`,
      `https://kylevb.com/user/${id}.`,
      `(https://kylevb.com/user/${id})`,
      `<kylevb.com/mylist/${id}>, glass.`,
      `\u201c${id}\u201d`,
      `https://kylevb.com/user/${id.slice(0, 20)}`,
      "kylevb.com/mylist",
      "glass mode",
      "( )",
      "kylevb-anime",
      "kylevb.com",
    ];
    expect(inputs).toHaveLength(50);
    for (const raw of inputs) expect(S.parseParameter(raw), String(raw)).toEqual(parseWidgetParameter(raw));
  });

  it("nextRefreshMs matches widgetNextRefreshMs", () => {
    const outcomes: WidgetOutcome[] = ["ok", "fresh", "saved", "offline", "unavailable", "setup", "bad-link", "not-found", "outdated", "error"];
    const rows = payloadAt("mixed").rows;
    for (let round = 0; round < 300; round++) {
      const nowMs = NOW + Math.round((rand() - 0.3) * 86_400_000);
      const shown = rows.slice(Math.floor(rand() * 4), Math.floor(rand() * 4) + 1);
      const hungrySince = rand() < 0.5 ? null : NOW_S + Math.round((rand() - 0.5) * 7200);
      const outcome = pick(outcomes);
      expect(S.nextRefreshMs(shown, nowMs, outcome, hungrySince)).toBe(widgetNextRefreshMs(shown, nowMs, outcome, hungrySince));
    }
  });

  it("isHungry matches widgetIsHungry, the phone's clock behind or ahead of the server", () => {
    for (const skew of [-5000, -1000, -1, 0, 1, 1000, 5000]) {
      for (const since of [null, NOW_S - 60, NOW_S, NOW_S + 1, NOW_S + 600]) {
        const payload = { hungrySince: since, generatedAt: NOW };
        expect(S.isHungry(payload, NOW + skew), `${since} ${skew}`).toBe(widgetIsHungry(payload, NOW + skew));
      }
    }
  });

  it("uses the server's constants", () => {
    // The script's art version before any payload names one: a WIDGET_ART_VERSION bump must update it (and
    // SCRIPT_VERSION), or a fresh install's setup state asks for art the server no longer serves.
    expect(S.ART_VERSION_FALLBACK).toBe(WIDGET_ART_VERSION);
    expect(S.RUN_BUDGET_MS).toBeGreaterThanOrEqual(5000);
    expect({
      SCRIPT_VERSION: S.SCRIPT_VERSION,
      SCHEMA: S.SCHEMA,
      ORIGIN: S.ORIGIN,
      API_PATH: S.API_PATH,
      ART_PATH: S.ART_PATH,
      GRACE_S: S.GRACE_S,
      SOON_S: S.SOON_S,
      TIMER_S: S.TIMER_S,
      CANONICAL_ID: S.CANONICAL_ID.source,
      REFRESH: S.REFRESH,
      FRESH_MS: S.FRESH_MS,
      SAVED_MAX_AGE_MS: S.SAVED_MAX_AGE_MS,
    }).toEqual({
      SCRIPT_VERSION: WIDGET_SCRIPT_VERSION,
      SCHEMA: WIDGET_SCHEMA,
      ORIGIN: WIDGET_ORIGIN,
      API_PATH: widgetListPath(""),
      ART_PATH: widgetArtPath(""),
      GRACE_S: AIRED_GRACE_SECONDS,
      SOON_S: WIDGET_SOON_SECONDS,
      TIMER_S: WIDGET_TIMER_SECONDS,
      CANONICAL_ID: CANONICAL_ID_RE.source,
      REFRESH: WIDGET_REFRESH,
      FRESH_MS: WIDGET_FRESH_MS,
      SAVED_MAX_AGE_MS: WIDGET_SAVED_MAX_AGE_MS,
    });
  });

  it("keeps the server's fallback copy and base words", () => {
    expect(S.FALLBACK_COPY).toEqual(WIDGET_FALLBACK_COPY);
    const copy = widgetCopy("Kyle", "rows", NOW);
    expect(S.BASE_COPY).toEqual({ tags: copy.tags, sep: copy.sep });
  });

  it("asks only for art files the server prebuilds", () => {
    const names = new Set<string>();
    for (const scale of [2, 3]) for (const cap of [2, 3]) for (const name of S.artNamesFor(scale, cap)) names.add(name);
    for (const tier of [null, "named", "demon", "lord"]) {
      for (const mood of ["idle", "happy", "worried", "sage"]) names.add(S.artName("slime", { tier, mood }));
      for (const mood of ["idle", "worried"]) names.add(S.artName("glyph", { tier, mood }));
    }
    for (const family of ["small", "medium", "large"]) for (const scale of [2, 3]) names.add(S.artName("sky", { family, scale }));
    expect([...names].sort()).toEqual([...WIDGET_ART_NAMES].sort());
    for (const name of names) expect(S.artFile(name, 1)).toBe(widgetArtFile(name as (typeof WIDGET_ART_NAMES)[number]));
    expect(S.artNamesFor(3, 3)).toHaveLength(15);
  });

  it("accepts every payload buildWidgetPayload makes, and sanitizePayload keeps it whole", () => {
    const scenarios: Scenario[] = ["mixed", "premiere-unknown-long", "hungry", "not-hungry", "resting", "nothing-scheduled", "empty-list", "one-row", "worst-case"];
    for (const scenario of scenarios) {
      const payload = JSON.parse(JSON.stringify(payloadAt(scenario))) as WidgetPayload;
      expect(S.isPayload(payload), scenario).toBe(true);
      expect(S.sanitizePayload(payload), scenario).toEqual(payload);
    }
  });

  it("uses the site's colors", () => {
    const stops = [...OG_SKY_GRADIENT.matchAll(/(#[0-9a-f]{6}) (\d+)%/g)].map((m) => [m[1], Number(m[2]) / 100]);
    expect(S.T.skyStops).toEqual(stops);
    expect(S.T.sage).toBe(SLIME_COLORS.aura);
    const card = readFileSync(new URL("../../components/mylist/NextEpisodes.tsx", import.meta.url), "utf8");
    expect(card).toContain(`text-[${S.T.console}]`);
    expect(card).toContain(`text-[${S.T.sage}]`);
    // The rows' countdown tones come from CountdownText (the card renders it): soon text, the soon dot and the
    // emerald dot of an episode that just aired. The widget keeps them (and the dark half of each glass pair).
    const countdown = readFileSync(new URL("../../components/home/CountdownText.tsx", import.meta.url), "utf8");
    const message = "CountdownText's tones changed: update kylevb-anime.js's T and its glass pairs (CLAUDE.md §9.18)";
    // The row mode the card renders (the last return) and the dot both modes share.
    const rowMode = countdown.slice(countdown.lastIndexOf("return ("));
    expect(rowMode, `${message}: the row mode's soon text`).toContain("inline-flex items-center gap-1.5 tabular-nums data-[soon]:text-amber-200");
    expect(countdown, `${message}: the dot`).toContain('state === "airing" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"');
    expect(rowMode, `${message}: the row mode's dot`).toContain("{dot}");
    const tones = { soonText: colors.amber[200], soonDot: colors.amber[400], airedDot: colors.emerald[400] };
    for (const [name, hex] of Object.entries(tones)) {
      expect(S.T[name], `${message}: T.${name}`).toBe(hex);
      expect(S.T.glass[name][1], `${message}: T.glass.${name}`).toBe(hex);
    }
  });

  it("picks each screen's size row: exact, else the largest that fits, else the smallest; iPads from the iPad table", () => {
    expect(S.sizeRow({ width: 393, height: 852 })[2]).toBe(158);
    expect(S.sizeRow({ width: 852, height: 393 })[2]).toBe(158);
    expect(S.sizeRow({ width: 320, height: 568 })[2]).toBe(148);
    expect(S.sizeRow({ width: 0, height: 0 })[2]).toBe(148);
    // Every iPad screen is bigger than every phone, so a phone row would overflow an iPad's widgets.
    expect(S.sizeRow({ width: 820, height: 1180 }, true).slice(2, 5)).toEqual([155, 342, 342]);
    expect(S.sizeRow({ width: 744, height: 1133 }, true).slice(2, 5)).toEqual([141, 305.5, 305.5]);
    expect(S.sizeRow({ width: 1032, height: 1376 }, true)[2]).toBe(170);
    expect(S.sizeRow({ width: 700, height: 1000 }, true)[2]).toBe(141); // an unknown small iPad: the smallest
    expect(S.sizeRow({ width: 900, height: 1300 }, true)[2]).toBe(155); // an unknown iPad: the largest that fits
    expect(S.metrics("medium", { width: 393, height: 852 })).toMatchObject({ rowH: 44, coverH: 38, coverW: 27 });
    expect(S.metrics("large", { width: 375, height: 667 })).toMatchObject({ perchH: 36, rowH: 47, coverH: 41, coverW: 29 });
    const small = S.metrics("small", { width: 744, height: 1133 }, true);
    expect(small.W - 24, "the tiny small widget's bottom row").toBeGreaterThanOrEqual(small.timerBox + small.slimeW);
  });

  it("still matches the Next-episodes card (a look-alike tripwire)", () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
    const card = read("../../components/mylist/NextEpisodes.tsx");
    // Any change to the card's elements or classes trips this, so the widget's copy of its layout gets a look: every
    // JSX element's depth, tag and className expression in document order (an added, removed, re-tagged or moved
    // element, a class edit, a conditional or concatenated className, where {CARD} is used), plus CARD's value.
    expect(classNameProblems(card), "extend the tripwire's extraction (or the allowlist) so it hashes what these classes are").toEqual([]);
    const classes = jsxShape(card);
    expect(
      createHash("sha256").update(classes.join("\n")).digest("hex").slice(0, 16),
      "The Next-episodes card's classes changed: check widgets/scriptable/kylevb-anime.js's renderers still match it " +
        "(CLAUDE.md §9.18), then update this hash"
    ).toBe("b4ab233d2ba550b6");
    const hero = read("../../components/home/HeroNextUp.tsx");
    const message = "The Next-episodes card changed: update widgets/scriptable/kylevb-anime.js too (CLAUDE.md §9.18)";
    for (const needle of ["const ROWS = 3;", "h-14 w-10", "text-[#95ccff]", "text-[#cfe8ff]", "rgb(164,164,164)", "NEXT_EPISODES_TITLE", "NEXT_EPISODES_NOTE", "NEXT_UP_LABEL", "《Notice》"]) {
      expect(card.includes(needle), `${message}: NextEpisodes.tsx lost ${needle}`).toBe(true);
    }
    for (const needle of ["const ROWS = 3;", "COUNTDOWNS_RESTING", "NEXT_EPISODES_TITLE", "NEXT_UP_LABEL"]) {
      expect(hero.includes(needle), `${message}: HeroNextUp.tsx lost ${needle}`).toBe(true);
    }
    expect(S.SHOWN.large).toBe(3);
  });

  it("hides every Web and Node global from the script, not just a list (performance, crypto, setImmediate…)", async () => {
    const hidden = realmOnlyGlobals({});
    for (const name of ["performance", "crypto", "setImmediate", "AbortController", "structuredClone", "fetch", "process", "Buffer"]) {
      if (name in globalThis) expect(hidden, name).toContain(name);
    }
    for (const name of ["JSON", "Math", "Promise", "Date", "Array", "Map", "Symbol", "parseInt", "encodeURIComponent"]) {
      expect(hidden, name).not.toContain(name);
    }
    // And runScript applies it: a probe run exactly like the script sees undefined for every one of them.
    const kept = ["Math", "JSON", "Promise", "Request", "Timer", "FileManager"];
    const names = [...hidden, ...kept];
    let provided: string[] = [];
    const probe = await runScript({
      mode: { kind: "app", alerts: [] },
      nowMs: NOW,
      patch: (globals) => (provided = Object.keys(globals)),
      source: `module.exports.seen = {${names.map((n) => `${JSON.stringify(n)}: typeof ${n}`).join(", ")}}; Script.complete();`,
    });
    const seen = probe.exports.seen as Record<string, string>;
    const realmOnly = hidden.filter((name) => !provided.includes(name));
    expect(realmOnly.length).toBeGreaterThan(20);
    for (const name of realmOnly) expect(seen[name], name).toBe("undefined");
    for (const name of kept) expect(seen[name], name).not.toBe("undefined");
  });

  it("carries the README's setup text in its header, word for word", () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
    const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
    const script = read("./kylevb-anime.js");
    const header = script.slice(script.indexOf("── SETUP"), script.indexOf("── WHAT IT SENDS"));
    const fromScript = header
      .split("\n")
      .slice(1)
      .map((line) => line.replace(/^ \* ?/, ""))
      .join("\n");
    const readme = read("./README.md");
    const section = readme.slice(readme.indexOf("## Setup"), readme.indexOf("## For maintainers"));
    const fromReadme = section.slice(section.indexOf("```") + 3, section.lastIndexOf("```"));
    expect(normalize(fromScript)).toBe(normalize(fromReadme));
    expect(normalize(fromScript)).toContain("Copy link");
  });
});

/** NextEpisodes.tsx's JSX, for the tripwire: CARD's value, then `depth:tag:className[:mode]` per element in order. */
function jsxShape(source: string): string[] {
  const file = ts.createSourceFile("NextEpisodes.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node, depth: number) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "CARD") out.unshift(`CARD=${node.initializer?.getText(file)}`);
    let inner = depth;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      // className, and mode (CountdownText's mode decides which of its tones the card shows).
      const attr = (name: string) => {
        const found = opening.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(file) === name);
        return found && ts.isJsxAttribute(found) ? (found.initializer?.getText(file) ?? "") : "-";
      };
      out.push(`${depth}:${opening.tagName.getText(file)}:${attr("className")}${attr("mode") === "-" ? "" : `:mode=${attr("mode")}`}`);
      inner = depth + 1;
    }
    ts.forEachChild(node, (child) => visit(child, inner));
  };
  visit(file, 0);
  return out;
}

/** Classes are hashed as written: none may come from a value the hash can't see (only CARD, by value, is resolved). */
const NOT_MIRRORED = new Set(["FOCUS_RING_PANEL"]); // a focus ring: nothing the widget draws

/** Each className (and CARD's value) that isn't built only from literals, CARD and NOT_MIRRORED, for the tripwire. */
function classNameProblems(source: string): string[] {
  const file = ts.createSourceFile("NextEpisodes.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: string[] = [];
  const check = (expr: ts.Expression): void => {
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return;
    if (ts.isParenthesizedExpression(expr)) return check(expr.expression);
    if (ts.isIdentifier(expr) && expr.text === "CARD") return;
    if (ts.isConditionalExpression(expr)) return (check(expr.whenTrue), check(expr.whenFalse));
    if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) return (check(expr.left), check(expr.right));
    if (ts.isTemplateExpression(expr)) {
      for (const span of expr.templateSpans) {
        if (!(ts.isIdentifier(span.expression) && NOT_MIRRORED.has(span.expression.text))) problems.push(`\${${span.expression.getText(file)}}`);
      }
      return;
    }
    problems.push(expr.getText(file));
  };
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "CARD" && !(node.initializer && ts.isStringLiteral(node.initializer))) {
      problems.push(`CARD = ${node.initializer?.getText(file)}`);
    }
    if (ts.isJsxAttribute(node) && node.name.getText(file) === "className" && node.initializer) {
      if (ts.isJsxExpression(node.initializer)) {
        if (node.initializer.expression) check(node.initializer.expression);
      } else if (!ts.isStringLiteral(node.initializer)) problems.push(node.initializer.getText(file));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}
