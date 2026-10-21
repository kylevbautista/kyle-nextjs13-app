import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  slimeBaseY,
  slimeMarkupHeight,
  SLIME_ACCESSORIES,
  SLIME_ASPECT,
  SLIME_BODY_PATH,
  SLIME_FACE,
  SLIME_VIEWBOX,
  SLIME_COLORS,
  slimeGlyphSvgMarkup,
  slimeHeight,
  slimeSvgMarkup,
} from "./slimeArt";

/** Every x,y pair in an SVG path string (all commands here use absolute pairs). */
const pathPoints = (d: string) => {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const points: [number, number][] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  return points;
};

describe("slime geometry", () => {
  it("keeps the 200 × 170 viewBox and its aspect ratio", () => {
    expect(SLIME_VIEWBOX).toBe("0 0 200 170");
    expect(SLIME_ASPECT).toBeCloseTo(0.85);
  });

  it("rounds the rendered height to whole pixels", () => {
    expect(slimeHeight(200)).toBe(170);
    expect(slimeHeight(28)).toBe(24); // 23.8
    expect(slimeHeight(64)).toBe(54); // 54.4
    expect(slimeHeight(80)).toBe(68);
    expect(slimeHeight(380)).toBe(323);
  });

  it("draws the body, face and accessories inside the viewBox", () => {
    const paths = [
      SLIME_BODY_PATH,
      ...SLIME_FACE.happyEyes,
      ...SLIME_FACE.worriedEyes,
      ...SLIME_FACE.sageEyes,
      SLIME_FACE.mouth,
      SLIME_FACE.worriedMouth,
      SLIME_ACCESSORIES.star,
      SLIME_ACCESSORIES.crown.path,
    ];
    for (const d of paths) {
      for (const [x, y] of pathPoints(d)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(200);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(170);
      }
    }
  });

  it("builds a closed four-point star around its center", () => {
    expect(SLIME_ACCESSORIES.star.startsWith("M138 11 ")).toBe(true);
    expect(SLIME_ACCESSORIES.star.endsWith("Z")).toBe(true);
    const points = pathPoints(SLIME_ACCESSORIES.star);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([129, 147]);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([11, 29]);
  });
});

describe("slimeSvgMarkup", () => {
  it("is a standalone SVG sized from the width", () => {
    const svg = slimeSvgMarkup({ size: 380 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="380" height="323">')).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(slimeSvgMarkup()).toContain('width="200" height="170"');
  });

  it("has nothing next/og can't render: no CSS variables, classes, styles or animation", () => {
    for (const svg of [slimeSvgMarkup(), slimeSvgMarkup({ mood: "happy" })]) {
      expect(svg).not.toMatch(/var\(|class=|style=|animat|@keyframes|<script/i);
    }
  });

  it("only references gradients and clip paths it defines", () => {
    const svg = slimeSvgMarkup();
    const defined = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    const referenced = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) expect(defined.has(id)).toBe(true);
  });

  it("draws open eyes by default and happy arcs for the happy mood", () => {
    const idle = slimeSvgMarkup();
    const happy = slimeSvgMarkup({ mood: "happy" });
    for (const d of SLIME_FACE.happyEyes) {
      expect(idle).not.toContain(d);
      expect(happy).toContain(d);
    }
    // Catchlights belong to the open eyes only.
    expect(idle.match(/<circle [^>]*r="2"/g)).toHaveLength(2);
    expect(happy.match(/<circle [^>]*r="2"/g)).toBeNull();
    // Happier blush.
    expect(idle).toContain('fill-opacity="0.3"');
    expect(happy).toContain('fill-opacity="0.5"');
  });

  it("is well-formed: every element is closed", () => {
    const svg = slimeSvgMarkup();
    const opened = (svg.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length;
    const closed = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
    expect(opened).toBe(closed);
  });
});

describe("slimeSvgMarkup tiers (the share images)", () => {
  const sha = (text: string) => createHash("sha256").update(text).digest("hex");

  it("keeps the plain slime byte for byte", () => {
    expect(sha(slimeSvgMarkup()).startsWith("79df9b01702121c0")).toBe(true);
    expect(sha(slimeSvgMarkup({ size: 380 })).startsWith("20c667c416636eef")).toBe(true);
    expect(sha(slimeSvgMarkup({ mood: "happy" })).startsWith("920f8057672030b2")).toBe(true);
    expect(slimeSvgMarkup({ tier: "slime" })).toBe(slimeSvgMarkup());
  });

  it("keeps the share images' tier slimes byte for byte (both draw them at 150)", () => {
    expect(sha(slimeSvgMarkup({ size: 150, tier: "named" })).startsWith("856a43b5c683e6ae")).toBe(true);
    expect(sha(slimeSvgMarkup({ size: 150, tier: "demon" })).startsWith("5fb510fa1ae3b96b")).toBe(true);
    expect(sha(slimeSvgMarkup({ size: 150, tier: "lord" })).startsWith("282fbab14f238237")).toBe(true);
  });

  it("draws each tier's accessories", () => {
    const named = slimeSvgMarkup({ tier: "named" });
    expect(named).toContain(SLIME_ACCESSORIES.star);
    expect(named).toContain('stroke="#f5c451" stroke-opacity="0.7"');
    expect(named).toContain('viewBox="0 0 200 170"');
    expect(named).not.toContain('r="92"');
    expect(named).not.toContain(SLIME_ACCESSORIES.crown.path);

    const demon = slimeSvgMarkup({ tier: "demon", size: 150 });
    expect(demon).toContain('viewBox="0 -4 200 194"');
    expect(demon).toContain(`height="${Math.round((150 * 194) / 200)}"`);
    expect(demon).toMatch(/<circle cx="100" cy="94" r="92" [^>]*stroke-dasharray="2 6"/);
    expect(demon).toContain(SLIME_ACCESSORIES.star);
    expect(demon).not.toContain(SLIME_ACCESSORIES.crown.path);

    const lord = slimeSvgMarkup({ tier: "lord" });
    expect(lord).toContain('viewBox="0 -4 200 194"');
    expect(lord).toContain(SLIME_ACCESSORIES.crown.path);
    expect(lord.match(/fill="#fff3c4"/g)).toHaveLength(3);
    expect(lord).not.toContain(SLIME_ACCESSORIES.star);
  });

  it("places the slime on a line", () => {
    expect(slimeBaseY(150, "named")).toBe(119);
    expect(slimeBaseY(150, "lord")).toBe(122);
    expect(slimeMarkupHeight(150, "lord")).toBe(146);
    expect(slimeMarkupHeight(150, "named")).toBe(128);
  });

  it("stays next/og-safe and well-formed in every tier", () => {
    for (const tier of ["slime", "named", "demon", "lord"] as const) {
      const svg = slimeSvgMarkup({ tier });
      expect(svg).not.toMatch(/var\(|class=|style=|animat|@keyframes|<script/i);
      const defined = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const [, id] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(defined.has(id)).toBe(true);
      const opened = (svg.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length;
      const closed = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
      expect(opened).toBe(closed);
    }
  });
});

const wellFormed = (svg: string) => {
  const opened = (svg.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length;
  const closed = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  return opened === closed;
};
const referencesOnlyItsOwnIds = (svg: string) => {
  const defined = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  return [...svg.matchAll(/url\(#([^)]+)\)/g)].every(([, id]) => defined.has(id));
};

describe("slimeSvgMarkup's worried and sage faces (the iPhone widget's art; Slime.tsx#Face)", () => {
  it("draws Slime.tsx's eyes, mouth, sweat and blush", () => {
    const worried = slimeSvgMarkup({ mood: "worried" });
    for (const d of SLIME_FACE.worriedEyes) {
      expect(worried).toContain(`<path d="${d}" fill="none" stroke="${SLIME_COLORS.eye}" stroke-width="4" stroke-linecap="round"/>`);
    }
    expect(worried).toContain(`d="${SLIME_FACE.worriedMouth}"`);
    expect(worried).not.toContain(`d="${SLIME_FACE.mouth}"`);
    expect(worried).toContain(`<path d="${SLIME_FACE.sweat}" fill="${SLIME_COLORS.sweat}" fill-opacity="0.9"/>`);
    expect(worried.match(/fill-opacity="0.2"/g)).toHaveLength(2);

    const sage = slimeSvgMarkup({ mood: "sage" });
    for (const d of SLIME_FACE.sageEyes) expect(sage).toContain(`<path d="${d}" fill="none" stroke="${SLIME_COLORS.eye}" stroke-width="3.5"`);
    expect(sage).toContain(`d="${SLIME_FACE.mouth}"`);
    expect(sage).not.toContain(SLIME_FACE.sweat);
    expect(sage.match(/fill="#ff9ec7" fill-opacity="0.3"/g)).toHaveLength(2);

    // Neither has open eyes or catchlights.
    for (const svg of [worried, sage]) {
      expect(svg).not.toMatch(/<circle [^>]*r="2"/);
      expect(svg).not.toContain('rx="6" ry="9"');
    }
  });

  it("stays next/og-safe and well-formed in every mood × tier", () => {
    for (const mood of ["idle", "happy", "worried", "sage"] as const) {
      for (const tier of [undefined, "named", "demon", "lord"] as const) {
        const svg = slimeSvgMarkup({ mood, tier, size: 144 });
        expect(svg).not.toMatch(/var\(|class=|style=|animat|@keyframes|<script/i);
        expect(referencesOnlyItsOwnIds(svg)).toBe(true);
        expect(wellFormed(svg)).toBe(true);
      }
    }
  });
});

describe("slimeGlyphSvgMarkup (the widget's Lock Screen and glass glyph)", () => {
  it("cuts the face out of a white body with a mask and keeps tier accessories", () => {
    const named = slimeGlyphSvgMarkup({ size: 120, tier: "named" });
    expect(named.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="120" height="102">')).toBe(true);
    expect(named).toContain(`<path d="${SLIME_BODY_PATH}" fill="#ffffff" mask="url(#kv-glyph)"/>`);
    expect(named).toMatch(/<mask id="kv-glyph"><path d="[^"]+" fill="#fff"\/><ellipse [^>]*fill="#000"\/>/);
    expect(named).toContain(`<path d="${SLIME_ACCESSORIES.star}" fill="#ffffff"/>`);
    expect(named).not.toContain('r="92"');

    const demon = slimeGlyphSvgMarkup({ size: 120, tier: "demon" });
    expect(demon).toContain('viewBox="0 -4 200 194" width="120" height="116"');
    expect(demon).toMatch(/<circle cx="100" cy="94" r="92" fill="none" stroke="#9aa4b2" stroke-width="2.5" stroke-dasharray="2 6"/);
    expect(demon).toContain(SLIME_ACCESSORIES.star);

    const lord = slimeGlyphSvgMarkup({ size: 120, tier: "lord" });
    expect(lord).toContain(`<g transform="${SLIME_ACCESSORIES.crown.transform}"><path d="${SLIME_ACCESSORIES.crown.path}" fill="#ffffff"/></g>`);
    expect(lord).not.toContain(SLIME_ACCESSORIES.star);

    const worried = slimeGlyphSvgMarkup({ size: 120, mood: "worried" });
    expect(worried).toContain(`<path d="${SLIME_FACE.sweat}" fill="#000"/>`);
    for (const d of SLIME_FACE.worriedEyes) expect(worried).toContain(d);
    expect(worried).not.toContain(SLIME_ACCESSORIES.star);
  });

  it("uses only #fff/#ffffff/#000/#9aa4b2, no gradients, and stays next/og-safe", () => {
    for (const mood of ["idle", "worried"] as const) {
      for (const tier of [undefined, "named", "demon", "lord"] as const) {
        const svg = slimeGlyphSvgMarkup({ size: 120, tier, mood });
        const colors = new Set([...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]+)"/gi)].map((m) => m[1].toLowerCase()));
        for (const color of colors) expect(["#fff", "#ffffff", "#000", "#9aa4b2"]).toContain(color);
        expect(svg).not.toMatch(/Gradient|opacity|var\(|class=|style=|animat|<script/i);
        expect(referencesOnlyItsOwnIds(svg)).toBe(true);
        expect(wellFormed(svg)).toBe(true);
      }
    }
  });
});
