/* eslint-disable @next/next/no-img-element -- next/og (Satori) renders plain <img> from data URIs */
import { ImageResponse } from "next/og";
import { slimeGlyphSvgMarkup, slimeSvgMarkup } from "@/components/home/slimeArt";
import { WIDGET_GLYPH_PX, WIDGET_SLIME_PX, widgetArtPixels, type WidgetArtSpec } from "@/lib/widgetArt";
import { OG_SKY_GRADIENT, svgDataUri } from "./OgSky";
import {
  hexAlpha,
  widgetAurora,
  widgetMagicules,
  widgetSkySpec,
  widgetStars,
  widgetTreeline,
  type SkyDot,
  type SkySpec,
} from "./widgetSky";

/*
 * The iPhone widget's art (app/api/widget/art/[file]/route.ts): text-free PNGs, so no fonts, data or clock.
 * Satori's dialect (CLAUDE.md §9.24): helpers that return arrays are called as functions, DOM order is paint
 * order, glows are radial gradients (never filter).
 */

/** Call as dots(): each dot's glow (centered on it), then the dot. */
function dots(list: SkyDot[], key: string) {
  return list.flatMap((dot, index) => {
    const out = [];
    if (dot.glow) {
      out.push(
        <div
          key={`${key}-glow-${index}`}
          style={{
            position: "absolute",
            left: dot.x + dot.d / 2 - dot.glow / 2,
            top: dot.y + dot.d / 2 - dot.glow / 2,
            width: dot.glow,
            height: dot.glow,
            backgroundImage: `radial-gradient(circle, ${hexAlpha(dot.color, 0.35)} 0%, ${hexAlpha(dot.color, 0)} 70%)`,
          }}
        />
      );
    }
    out.push(
      <div
        key={`${key}-${index}`}
        style={{
          position: "absolute",
          left: dot.x,
          top: dot.y,
          width: dot.d,
          height: dot.d,
          borderRadius: dot.d,
          backgroundColor: hexAlpha(dot.color, dot.o),
        }}
      />
    );
    return out;
  });
}

function Sky({ spec }: { spec: SkySpec }) {
  const tree = widgetTreeline(spec);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundImage: OG_SKY_GRADIENT }}>
      {widgetAurora(spec).map((glow, index) => (
        <div
          key={`aurora-${index}`}
          style={{
            position: "absolute",
            left: glow.left,
            top: glow.top,
            width: glow.width,
            height: glow.height,
            backgroundImage: glow.gradient,
          }}
        />
      ))}
      {dots(widgetStars(spec), "star")}
      {dots(widgetMagicules(spec), "magicule")}
      <img
        src={svgDataUri(tree.markup)}
        alt=""
        width={tree.width}
        height={tree.height}
        style={{ position: "absolute", left: 0, top: tree.top }}
      />
    </div>
  );
}

function Sprite({ markup, width, height }: { markup: string; width: number; height: number }) {
  return (
    <div style={{ width, height, display: "flex" }}>
      <img src={svgDataUri(markup)} alt="" width={width} height={height} />
    </div>
  );
}

/** The art file's PNG. */
export function widgetArtResponse(spec: WidgetArtSpec): ImageResponse {
  const size = widgetArtPixels(spec);
  const art =
    spec.kind === "sky" ? (
      <Sky spec={widgetSkySpec(spec.family, spec.scale)} />
    ) : spec.kind === "slime" ? (
      <Sprite markup={slimeSvgMarkup({ size: WIDGET_SLIME_PX, tier: spec.tier, mood: spec.mood, crop: "perch" })} {...size} />
    ) : (
      <Sprite markup={slimeGlyphSvgMarkup({ size: WIDGET_GLYPH_PX, tier: spec.tier, mood: spec.mood, crop: "perch" })} {...size} />
    );
  return new ImageResponse(art, size);
}
