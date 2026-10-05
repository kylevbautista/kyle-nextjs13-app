/**
 * The night sky's pure geometry, shared by NightSky.tsx (the React decor) and
 * the share images (components/og): the seeded PRNG, the three pine ridges of
 * the forest, and the magic circle's rings, hexagram and rune marks. No React,
 * no imports. treelineSvgMarkup and magicCircleSvgMarkup draw them as plain
 * SVG strings for next/og.
 */

/** mulberry32: a tiny deterministic PRNG. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------------- */
/* Forest: three pine ridgelines, each a seamless repeating tile.            */

export const FOREST_HEIGHT = 140;

export interface RidgeSpec {
  seed: number;
  tile: number;
  /** Height of the hill's base line above the bottom edge. */
  base: number;
  /** Amplitude of the rolling hill. */
  amp: number;
  minTree: number;
  maxTree: number;
  gap: [number, number];
}

/** One tile: a periodic hill (its ends meet with matching slopes) plus pines. */
export function ridgePath({ seed, tile, base, amp, minTree, maxTree, gap }: RidgeSpec) {
  const r = mulberry32(seed);
  const b0 = FOREST_HEIGHT - base;
  // y on the cubic hill below (x is linear in u because the controls sit at thirds).
  const hillY = (x: number) => {
    const u = x / tile;
    return b0 + 3 * amp * u * (1 - u) * (2 * u - 1);
  };
  let d = `M0 ${FOREST_HEIGHT}L0 ${b0}C${Math.round(tile / 3)} ${b0 - amp} ${Math.round(
    (2 * tile) / 3
  )} ${b0 + amp} ${tile} ${b0}L${tile} ${FOREST_HEIGHT}Z`;

  let x = 10 + r() * gap[0];
  while (true) {
    const h = minTree + r() * (maxTree - minTree);
    const w = h * 0.44;
    if (x + w / 2 > tile - 2) break;
    if (x - w / 2 >= 2) {
      const b = hillY(x) + 4;
      const p = (dx: number, dy: number) => `${Math.round(x + dx)} ${Math.round(b - dy)}`;
      d +=
        `M${p(-w / 2, 0)}L${p(-w * 0.16, h * 0.5)}L${p(-w * 0.34, h * 0.48)}` +
        `L${p(0, h)}L${p(w * 0.34, h * 0.48)}L${p(w * 0.16, h * 0.5)}L${p(w / 2, 0)}Z`;
    }
    x += gap[0] + r() * (gap[1] - gap[0]);
  }
  return d;
}

export const RIDGES = {
  far: {
    color: "#0f1c31",
    tile: 310,
    d: ridgePath({ seed: 11, tile: 310, base: 62, amp: 10, minTree: 16, maxTree: 38, gap: [12, 24] }),
  },
  mid: {
    color: "#0b1526",
    tile: 350,
    d: ridgePath({ seed: 23, tile: 350, base: 38, amp: 9, minTree: 22, maxTree: 54, gap: [16, 32] }),
  },
  near: {
    color: "#081020",
    tile: 430,
    d: ridgePath({ seed: 37, tile: 430, base: 14, amp: 6, minTree: 34, maxTree: 96, gap: [26, 58] }),
  },
} as const;

/* ------------------------------------------------------------------------- */
/* Magic circle: original geometry (rings, ticks, hexagram, rune marks).     */

/** Six original three-stroke geometric marks, drawn in a 12 × 12 box. */
export const RUNES = [
  "M0 -6L0 6M-5 -2L0 -6M0 2L5 6",
  "M-5 -6L5 -6M0 -6L0 6M-4 3L4 6",
  "M-5 6L0 -6M0 -6L5 6M-2 2L2 6",
  "M-5 -5L5 5M-5 5L0 0M2 -6L6 -2",
  "M-6 0L6 0M-3 -6L-3 0M3 0L3 6",
  "M-4 -6L4 -6M-4 -6L-4 6M-4 1L4 6",
];

export const HEXAGRAM =
  "M0 -120L103.92 60L-103.92 60Z M0 120L-103.92 -60L103.92 -60Z";

/** A stroked ring of the magic circle (NightSky.tsx#MagicCircle, magicCircleSvgMarkup). */
export interface CircleRing {
  r: number;
  opacity: number;
  width: number;
  dash?: string;
}

/** Both variants: the outer ring, then 48 ticks as dashes (circumference / 48), every 4th longer. */
export const MAGIC_CIRCLE_OUTER: readonly CircleRing[] = [
  { r: 150, opacity: 0.35, width: 1.5 },
  { r: 145, opacity: 0.35, width: 6, dash: "1.2 17.78" },
  { r: 143, opacity: 0.3, width: 10, dash: "1.4 73.47" },
];
/** `full` only: the hexagram's stroke, the six rune marks on r 132, the (counter-rotating, on the page) inner ring. */
export const MAGIC_CIRCLE_HEXAGRAM = { opacity: 0.18, width: 1.25 } as const;
export const MAGIC_CIRCLE_RUNE = { opacity: 0.4, width: 1.5 } as const;
export const runeTransform = (index: number) => `rotate(${30 + index * 60}) translate(0 -132)`;
export const MAGIC_CIRCLE_INNER: CircleRing = { r: 120, opacity: 0.5, width: 1.25, dash: "2 7" };

/* ------------------------------------------------------------------------- */
/* Static SVG strings for the share images (no animation, class or style).   */

/** The banners' forest as a standalone SVG: the three ridges tiled at the page band's scale. */
export function treelineSvgMarkup(width: number, height: number): string {
  const viewWidth = Math.round((width * FOREST_HEIGHT) / height); // 1200×64 → 2625: the 64px banner band's scale
  const names = ["far", "mid", "near"] as const;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${FOREST_HEIGHT}" width="${width}" height="${height}" preserveAspectRatio="none">`,
    `<defs>${names
      .map(
        (n) =>
          `<pattern id="kv-ridge-${n}" width="${RIDGES[n].tile}" height="${FOREST_HEIGHT}" patternUnits="userSpaceOnUse"><path d="${RIDGES[n].d}" fill="${RIDGES[n].color}"/></pattern>`
      )
      .join("")}</defs>`,
    names.map((n) => `<rect width="${viewWidth}" height="${FOREST_HEIGHT}" fill="url(#kv-ridge-${n})"/>`).join(""),
    `</svg>`,
  ].join("");
}

const ringMarkup = ({ r, opacity, width, dash }: CircleRing) =>
  `<circle r="${r}" stroke-opacity="${opacity}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

/** MagicCircle variant "full" as a static SVG string: the Evolution card's circle in a share image. */
export function magicCircleSvgMarkup(size: number): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-160 -160 320 320" width="${size}" height="${size}">`,
    `<g fill="none" stroke="#95ccff">`,
    MAGIC_CIRCLE_OUTER.map(ringMarkup).join(""),
    `<path d="${HEXAGRAM}" stroke-opacity="${MAGIC_CIRCLE_HEXAGRAM.opacity}" stroke-width="${MAGIC_CIRCLE_HEXAGRAM.width}" stroke-linejoin="round"/>`,
    RUNES.map(
      (d, i) =>
        `<g transform="${runeTransform(i)}"><path d="${d}" stroke-opacity="${MAGIC_CIRCLE_RUNE.opacity}" stroke-width="${MAGIC_CIRCLE_RUNE.width}" stroke-linecap="round"/></g>`
    ).join(""),
    ringMarkup(MAGIC_CIRCLE_INNER),
    `</g></svg>`,
  ].join("");
}
