import { slimePerchHeight } from "@/components/home/slimeArt";
import type { WidgetTier } from "@/lib/widget";

/**
 * The iPhone widget's static art (widgets/scriptable/kylevb-anime.js, CLAUDE.md §5.9): the night sky per widget
 * family and density, the tier slimes and their one-color glyphs, served prebuilt from
 * /api/widget/art/<name>.v<version>.png (components/og/WidgetArt.tsx draws them). The version is in the file
 * name, so the files are cached forever: bump WIDGET_ART_VERSION whenever a pixel changes.
 */
export const WIDGET_ART_VERSION = 1;

/**
 * A slime sprite's width in px: the widest spot the script draws at 3× is 52 pt (a 44-pt-high slime: the large
 * perch on Plus/Pro Max phones and the medium state body), so 156 px. Every sprite uses the perch crop
 * (slimeArt.ts#SLIME_PERCH_AURA_VIEWBOX): each tier's PNG ends at the same distance below its base.
 */
export const WIDGET_SLIME_PX = 156;
/** A glyph's width in px: glass mode draws it in the sprites' spots, so it matches them (the circular's is 42 pt). */
export const WIDGET_GLYPH_PX = 156;

export type WidgetSkyFamily = "small" | "medium" | "large";

/**
 * Each family's sky canvas in points: the largest measured widget (a 440-pt phone without icon labels) plus
 * about 1.5 % bleed, the star and magicule counts (the page banners' density), the forest band and the seed.
 */
export const WIDGET_SKY_PT = {
  small: { width: 180, height: 180, stars: 16, magicules: 4, treeline: 20, seed: 2101 },
  medium: { width: 384, height: 180, stars: 34, magicules: 6, treeline: 20, seed: 2102 },
  large: { width: 384, height: 388, stars: 72, magicules: 10, treeline: 40, seed: 2103 },
} as const satisfies Record<
  WidgetSkyFamily,
  { width: number; height: number; stars: number; magicules: number; treeline: number; seed: number }
>;

export const WIDGET_ART_NAMES = [
  "sky-small-2x",
  "sky-small-3x",
  "sky-medium-2x",
  "sky-medium-3x",
  "sky-large-2x",
  "sky-large-3x",
  "slime-named",
  "slime-demon",
  "slime-lord",
  "slime-named-happy",
  "slime-demon-happy",
  "slime-lord-happy",
  "slime-worried",
  "slime-sage",
  "glyph-named",
  "glyph-demon",
  "glyph-lord",
  "glyph-worried",
] as const;
export type WidgetArtName = (typeof WIDGET_ART_NAMES)[number];

export type WidgetArtSpec =
  | { name: WidgetArtName; kind: "sky"; family: WidgetSkyFamily; scale: 2 | 3 }
  | { name: WidgetArtName; kind: "slime"; tier?: WidgetTier; mood: "idle" | "happy" | "worried" | "sage" }
  | { name: WidgetArtName; kind: "glyph"; tier?: WidgetTier; mood: "idle" | "worried" };

/** "sky-medium-3x" → "sky-medium-3x.v1.png". */
export const widgetArtFile = (name: WidgetArtName, version: number = WIDGET_ART_VERSION) => `${name}.v${version}.png`;

const NAMES: ReadonlySet<string> = new Set(WIDGET_ART_NAMES);
const FILE_RE = /^([a-z0-9-]+)\.v(\d+)\.png$/;

/** "sky-medium-3x.v1.png" → its spec; another version, an unknown name or any other shape → null. */
export function parseWidgetArtFile(file: string): WidgetArtSpec | null {
  const match = FILE_RE.exec(file);
  if (!match || !NAMES.has(match[1]) || match[2] !== String(WIDGET_ART_VERSION)) return null;
  const name = match[1] as WidgetArtName;
  const parts = name.split("-");
  if (parts[0] === "sky") {
    return { name, kind: "sky", family: parts[1] as WidgetSkyFamily, scale: parts[2] === "2x" ? 2 : 3 };
  }
  if (parts[0] === "glyph") {
    return parts[1] === "worried"
      ? { name, kind: "glyph", mood: "worried" }
      : { name, kind: "glyph", tier: parts[1] as WidgetTier, mood: "idle" };
  }
  if (parts[1] === "worried" || parts[1] === "sage") return { name, kind: "slime", mood: parts[1] };
  return { name, kind: "slime", tier: parts[1] as WidgetTier, mood: parts[2] === "happy" ? "happy" : "idle" };
}

/** The PNG's size in px: skies are their canvas × scale; sprites and glyphs keep the slime's perch-crop aspect. */
export function widgetArtPixels(spec: WidgetArtSpec): { width: number; height: number } {
  if (spec.kind === "sky") {
    const { width, height } = WIDGET_SKY_PT[spec.family];
    return { width: width * spec.scale, height: height * spec.scale };
  }
  const width = spec.kind === "slime" ? WIDGET_SLIME_PX : WIDGET_GLYPH_PX;
  return { width, height: slimePerchHeight(width, spec.tier) };
}
