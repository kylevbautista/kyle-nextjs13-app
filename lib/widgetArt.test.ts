import { describe, expect, it } from "vitest";
import {
  WIDGET_ART_NAMES,
  WIDGET_ART_VERSION,
  parseWidgetArtFile,
  widgetArtFile,
  widgetArtPixels,
  type WidgetArtSpec,
} from "./widgetArt";

describe("widget art files", () => {
  it("names 18 files and round-trips each one", () => {
    expect(WIDGET_ART_NAMES).toHaveLength(18);
    expect(new Set(WIDGET_ART_NAMES).size).toBe(18);
    expect(WIDGET_ART_VERSION).toBe(1);
    expect(widgetArtFile("sky-medium-3x")).toBe("sky-medium-3x.v1.png");
    for (const name of WIDGET_ART_NAMES) expect(parseWidgetArtFile(widgetArtFile(name))?.name).toBe(name);
  });

  it("parses each kind", () => {
    expect(parseWidgetArtFile("sky-large-2x.v1.png")).toEqual({ name: "sky-large-2x", kind: "sky", family: "large", scale: 2 });
    expect(parseWidgetArtFile("slime-lord-happy.v1.png")).toEqual({ name: "slime-lord-happy", kind: "slime", tier: "lord", mood: "happy" });
    expect(parseWidgetArtFile("slime-demon.v1.png")).toEqual({ name: "slime-demon", kind: "slime", tier: "demon", mood: "idle" });
    expect(parseWidgetArtFile("slime-worried.v1.png")).toEqual({ name: "slime-worried", kind: "slime", mood: "worried" });
    expect(parseWidgetArtFile("slime-sage.v1.png")).toEqual({ name: "slime-sage", kind: "slime", mood: "sage" });
    expect(parseWidgetArtFile("glyph-named.v1.png")).toEqual({ name: "glyph-named", kind: "glyph", tier: "named", mood: "idle" });
    expect(parseWidgetArtFile("glyph-worried.v1.png")).toEqual({ name: "glyph-worried", kind: "glyph", mood: "worried" });
  });

  it("rejects other versions, unknown names and other shapes", () => {
    for (const file of [
      "sky-large-3x.v2.png",
      "sky-large-3x.v01.png",
      "sky-large-3x.v0.png",
      "sky-large-3x.png",
      "sky-large-4x.v1.png",
      "slime-slime.v1.png",
      "glyph-sage.v1.png",
      "SKY-LARGE-3X.v1.png",
      "sky-large-3x.v1.png.png",
      "../sky-large-3x.v1.png",
      "sky-large-3x.v1.jpg",
      "",
    ]) {
      expect(parseWidgetArtFile(file)).toBeNull();
    }
  });

  it("sizes each PNG", () => {
    const px = (name: (typeof WIDGET_ART_NAMES)[number]) => widgetArtPixels(parseWidgetArtFile(widgetArtFile(name)) as WidgetArtSpec);
    expect(px("sky-small-2x")).toEqual({ width: 360, height: 360 });
    expect(px("sky-small-3x")).toEqual({ width: 540, height: 540 });
    expect(px("sky-medium-2x")).toEqual({ width: 768, height: 360 });
    expect(px("sky-medium-3x")).toEqual({ width: 1152, height: 540 });
    expect(px("sky-large-2x")).toEqual({ width: 768, height: 776 });
    expect(px("sky-large-3x")).toEqual({ width: 1152, height: 1164 });
    expect(px("slime-named")).toEqual({ width: 156, height: 133 });
    expect(px("slime-worried")).toEqual({ width: 156, height: 133 });
    expect(px("slime-sage")).toEqual({ width: 156, height: 133 });
    // The aura tiers use the perch crop (the canvas ends at y 170, like the named slime's).
    expect(px("slime-demon-happy")).toEqual({ width: 156, height: 136 });
    expect(px("slime-lord")).toEqual({ width: 156, height: 136 });
    expect(px("glyph-named")).toEqual({ width: 156, height: 133 });
    expect(px("glyph-worried")).toEqual({ width: 156, height: 133 });
    expect(px("glyph-lord")).toEqual({ width: 156, height: 136 });
  });
});
