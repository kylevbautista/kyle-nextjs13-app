import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { magicCircleSvgMarkup, treelineSvgMarkup } from "@/components/home/skyArt";
import { OG_SKY_GRADIENT, OG_STARS } from "./OgSky";
import { hexAlpha, widgetAurora, widgetMagicules, widgetSkySpec, widgetStars, widgetTreeline } from "./widgetSky";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("the share images' sky", () => {
  it("OgSky's exports are byte-identical (the widget art has its own helpers)", () => {
    expect(sha(JSON.stringify(OG_STARS)).startsWith("2601ca17065e6c23")).toBe(true);
    expect(sha(OG_SKY_GRADIENT).startsWith("8a396204622d76fc")).toBe(true);
    expect(sha(treelineSvgMarkup(1200, 64)).startsWith("327affca71ccb30b")).toBe(true);
    expect(sha(magicCircleSvgMarkup(224)).startsWith("67c1be801111a7a0")).toBe(true);
  });
});

describe("the iPhone widget's sky (widgetSky.ts)", () => {
  const specs = (["small", "medium", "large"] as const).flatMap((family) =>
    ([2, 3] as const).map((scale) => ({ family, scale, spec: widgetSkySpec(family, scale) }))
  );

  it("sizes each family's canvas and forest band from points × scale", () => {
    expect(widgetSkySpec("small", 3)).toEqual({ width: 540, height: 540, scale: 3, stars: 16, magicules: 4, band: 60, seed: 2101 });
    expect(widgetSkySpec("medium", 2)).toEqual({ width: 768, height: 360, scale: 2, stars: 34, magicules: 6, band: 40, seed: 2102 });
    expect(widgetSkySpec("large", 3)).toEqual({ width: 1152, height: 1164, scale: 3, stars: 72, magicules: 10, band: 120, seed: 2103 });
  });

  it("stars and magicules are deterministic, inside the canvas and above the forest", () => {
    for (const { spec } of specs) {
      expect(widgetStars(spec)).toEqual(widgetStars(spec));
      expect(widgetMagicules(spec)).toEqual(widgetMagicules(spec));
      for (const dot of [...widgetStars(spec), ...widgetMagicules(spec)]) {
        expect(dot.x).toBeGreaterThanOrEqual(0);
        expect(dot.x + dot.d).toBeLessThanOrEqual(spec.width);
        expect(dot.y).toBeGreaterThanOrEqual(0);
        expect(dot.y + dot.d).toBeLessThanOrEqual(spec.height - spec.band);
      }
      for (const star of widgetStars(spec)) expect(star.y).toBeLessThanOrEqual(0.68 * (spec.height - spec.band));
      for (const mote of widgetMagicules(spec)) {
        expect(mote.x).toBeGreaterThanOrEqual(Math.floor(0.04 * spec.width));
        expect(mote.x).toBeLessThanOrEqual(Math.ceil(0.96 * spec.width));
        expect(mote.y).toBeGreaterThanOrEqual(Math.floor(0.45 * spec.height));
      }
    }
  });

  it("draws 16/34/72 stars (about 15 % bright, with a glow) and 4/6/10 magicules", () => {
    expect(specs.map(({ spec }) => widgetStars(spec).length)).toEqual([16, 16, 34, 34, 72, 72]);
    expect(specs.map(({ spec }) => widgetMagicules(spec).length)).toEqual([4, 4, 6, 6, 10, 10]);
    const large = widgetStars(widgetSkySpec("large", 3));
    const bright = large.filter((star) => star.glow > 0);
    expect(bright.length).toBeGreaterThan(3);
    expect(bright.length).toBeLessThan(20);
    for (const star of bright) expect(star).toMatchObject({ d: 4.5, o: 0.95, glow: 18 });
    for (const star of large.filter((s) => !s.glow)) {
      expect(star.d).toBe(3);
      expect(star.o).toBeGreaterThanOrEqual(0.35);
      expect(star.o).toBeLessThanOrEqual(0.8);
    }
    expect(widgetMagicules(widgetSkySpec("large", 2)).map((m) => m.color).slice(0, 3)).toEqual(["#95ccff", "#bfe6ff", "#c4b5fd"]);
  });

  it("sizes the aurora as fractions of the canvas", () => {
    const [violet, blue] = widgetAurora(widgetSkySpec("medium", 3));
    expect(violet).toMatchObject({ left: -115, top: -65, width: 864, height: 243 });
    expect(blue).toMatchObject({ left: 484, top: -11, width: 806, height: 216 });
    const [tall] = widgetAurora(widgetSkySpec("large", 2));
    expect(tall.height).toBe(162); // capped at 81 pt × 2, not 45 % of the canvas
  });

  it("puts the forest at the bottom, with no class, style or animation in its markup", () => {
    const tree = widgetTreeline(widgetSkySpec("large", 3));
    expect(tree).toMatchObject({ top: 1044, width: 1152, height: 120 });
    expect(tree.markup).not.toMatch(/class=|style=|animat|@keyframes|<script/i);
    expect(hexAlpha("#95ccff", 0.4)).toBe("rgba(149, 204, 255, 0.4)");
  });
});
