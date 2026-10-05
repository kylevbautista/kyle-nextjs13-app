import { describe, expect, it } from "vitest";
import {
  HEXAGRAM,
  MAGIC_CIRCLE_INNER,
  MAGIC_CIRCLE_OUTER,
  RIDGES,
  magicCircleSvgMarkup,
  runeTransform,
  treelineSvgMarkup,
} from "./skyArt";

describe("skyArt", () => {
  it("keeps the banners' ridges", () => {
    expect(RIDGES.far.d.startsWith("M0 140L0 78C103 68 207 88 310 78L310 140Z")).toBe(true);
  });

  it("draws the treeline as a standalone SVG", () => {
    const svg = treelineSvgMarkup(1200, 64);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2625 140" width="1200" height="64"')).toBe(true);
    expect(svg.match(/<pattern/g)).toHaveLength(3);
    expect(svg).not.toMatch(/class=|style=|var\(|animat/);
  });

  it("draws the magic circle from the one geometry source", () => {
    const svg = magicCircleSvgMarkup(224);
    expect(svg).toContain('viewBox="-160 -160 320 320" width="224" height="224"');
    expect(svg).toContain(HEXAGRAM);
    expect(svg.match(/translate\(0 -132\)/g)).toHaveLength(6);
    expect(svg).not.toMatch(/class=|style=|animat/);
    for (const ring of [...MAGIC_CIRCLE_OUTER, MAGIC_CIRCLE_INNER]) {
      expect(svg).toContain(
        `<circle r="${ring.r}" stroke-opacity="${ring.opacity}" stroke-width="${ring.width}"${ring.dash ? ` stroke-dasharray="${ring.dash}"` : ""}`
      );
    }
    expect(MAGIC_CIRCLE_OUTER.map((ring) => ring.r)).toEqual([150, 145, 143]);
    expect(MAGIC_CIRCLE_INNER).toEqual({ r: 120, opacity: 0.5, width: 1.25, dash: "2 7" });
    expect(runeTransform(0)).toBe("rotate(30) translate(0 -132)");
  });
});
