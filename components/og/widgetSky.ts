import { mulberry32, treelineSvgMarkup } from "@/components/home/skyArt";
import { WIDGET_SKY_PT, type WidgetSkyFamily } from "@/lib/widgetArt";

/*
 * The iPhone widget's night sky (components/og/WidgetArt.tsx), sized per widget family and screen density: the
 * share images' gradient, the banners' aurora and forest, the page banners' star density and a few frozen
 * magicules low in the sky. Pure geometry in pixels. OgSky.tsx's exports are fixed to 1200×630 and pinned
 * (widgetSky.test.ts), so the widget has its own helpers. Nothing focal sits in the outer 4 %: iOS may crop or
 * stretch a background image.
 */

export interface SkySpec {
  /** Pixels. */
  width: number;
  height: number;
  scale: 2 | 3;
  stars: number;
  magicules: number;
  /** The forest band's height in pixels. */
  band: number;
  seed: number;
}

export function widgetSkySpec(family: WidgetSkyFamily, scale: 2 | 3): SkySpec {
  const pt = WIDGET_SKY_PT[family];
  return {
    width: pt.width * scale,
    height: pt.height * scale,
    scale,
    stars: pt.stars,
    magicules: pt.magicules,
    band: pt.treeline * scale,
    seed: pt.seed,
  };
}

/** A dot of light: its top-left corner, diameter, opacity, glow box (0 = none) and color, all in pixels. */
export interface SkyDot {
  x: number;
  y: number;
  d: number;
  o: number;
  glow: number;
  color: string;
}

const STAR_COLOR = "#dff1ff";

/**
 * The stars: 85 % dim (1 pt, opacity 0.35–0.80), 15 % bright (1.5 pt, 0.95, a 6-pt glow), in the top 68 % of the
 * sky above the forest. Every star draws its random numbers in the same order, so the field is stable.
 */
export function widgetStars(spec: SkySpec): SkyDot[] {
  const rand = mulberry32(spec.seed);
  const top = 0.68 * (spec.height - spec.band);
  return Array.from({ length: spec.stars }, () => {
    const x = rand() * spec.width;
    const y = rand() * top;
    const bright = rand() < 0.15;
    const o = 0.35 + rand() * 0.45;
    const d = (bright ? 1.5 : 1) * spec.scale;
    return {
      x: Math.round(Math.min(x, spec.width - d)),
      y: Math.round(y),
      d,
      o: bright ? 0.95 : Math.round(o * 100) / 100,
      glow: bright ? 6 * spec.scale : 0,
      color: STAR_COLOR,
    };
  });
}

const MAGICULE_COLORS = ["#95ccff", "#bfe6ff", "#c4b5fd"] as const;

/** Frozen magicules: 1.5–3 pt motes low in the sky (every third violet), opacity 0.4, each with a 3×d glow. */
export function widgetMagicules(spec: SkySpec): SkyDot[] {
  const rand = mulberry32(spec.seed + 100);
  const { width: w, height: h, band } = spec;
  return Array.from({ length: spec.magicules }, (_, index) => {
    const x = 0.04 * w + rand() * 0.92 * w;
    const y = 0.45 * h + rand() * (h - band - 0.04 * h - 0.45 * h);
    const d = Math.round((1.5 + rand() * 1.5) * spec.scale);
    return { x: Math.round(x), y: Math.round(y), d, o: 0.4, glow: 3 * d, color: MAGICULE_COLORS[index % 3] };
  });
}

/** The banners' "Storm Dragon" aurora (OgSky#ogAurora) as fractions of the canvas. */
export function widgetAurora(spec: SkySpec): { left: number; top: number; width: number; height: number; gradient: string }[] {
  const { width: w, height: h, scale } = spec;
  return [
    {
      left: Math.round(-0.1 * w),
      top: Math.round(-0.12 * h),
      width: Math.round(0.75 * w),
      height: Math.round(Math.min(0.45 * h, 81 * scale)),
      gradient: "radial-gradient(ellipse, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0) 68%)",
    },
    {
      left: Math.round(0.42 * w),
      top: Math.round(-0.02 * h),
      width: Math.round(0.7 * w),
      height: Math.round(Math.min(0.4 * h, 72 * scale)),
      gradient: "radial-gradient(ellipse, rgba(93, 174, 241, 0.16) 0%, rgba(93, 174, 241, 0) 68%)",
    },
  ];
}

/** The forest along the bottom: the banners' ridges, their pines scaled to the band (skyArt.ts). */
export function widgetTreeline(spec: SkySpec): { markup: string; top: number; width: number; height: number } {
  return {
    markup: treelineSvgMarkup(spec.width, spec.band),
    top: spec.height - spec.band,
    width: spec.width,
    height: spec.band,
  };
}

/** "#95ccff", 0.4 → "rgba(149, 204, 255, 0.4)". */
export function hexAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
