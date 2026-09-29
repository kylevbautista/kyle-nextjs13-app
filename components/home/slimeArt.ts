/**
 * The kylevb slime: single source of its geometry, shared by the React SVG
 * (./Slime.tsx) and the share image (app/(home)/opengraph-image.tsx).
 *
 * An ORIGINAL drawing: a glossy droplet whose tip curls to the right, with
 * open eyes, a small smile and blush. It is a tribute to the slime-form
 * mascot, not a trace of /rimuru.png or any official art, and the UI only
 * ever calls it "the slime".
 *
 * Coordinates are in the 200 × 170 viewBox.
 */

export const SLIME_VIEWBOX = "0 0 200 170";
export const SLIME_ASPECT = 170 / 200;

/** Rendered height for a given width (the viewBox is 200 × 170). */
export const slimeHeight = (size: number) => Math.round(size * SLIME_ASPECT);

/** Where every squash/stretch pivots: the middle of the base. */
export const SLIME_PIVOT = "100px 158px";

export const SLIME_BODY_PATH =
  "M112 16 C120 42,178 76,182 118 C186 146,156 158,100 158 C44 158,14 146,18 118 C22 80,70 52,96 36 C104 30,109 24,112 16 Z";

/** Body fill: radialGradient cx 38%, cy 30%, r 80%. */
export const SLIME_GRADIENT = { cx: "38%", cy: "30%", r: "80%" } as const;
export const SLIME_GRADIENT_STOPS: { offset: string; color: string }[] = [
  { offset: "0%", color: "#d6f0ff" },
  { offset: "35%", color: "#7cc4f7" },
  { offset: "70%", color: "#3d95e6" },
  { offset: "100%", color: "#2166b8" },
];

export const SLIME_COLORS = {
  eye: "#0f2442",
  blush: "#ff9ec7",
  baseBand: "#1b4f91",
  rim: "#bfe6ff",
  rimNamed: "#f5c451",
  sweat: "#bfe6ff",
  aura: "#95ccff",
  gold: "#f5c451",
  goldStroke: "#b8860b",
} as const;

type Ellipse = { cx: number; cy: number; rx: number; ry: number };
type Circle = { cx: number; cy: number; r: number };

/** Highlights, the darker base band and the ground shadow. */
export const SLIME_DETAILS: {
  gloss: Ellipse & { rotate: number };
  sparkle: Circle;
  reflection: Ellipse;
  shadow: Ellipse;
  /** The base band fades in from this y to the bottom of the body. */
  bandFrom: number;
} = {
  gloss: { cx: 70, cy: 70, rx: 22, ry: 12, rotate: -30 },
  sparkle: { cx: 60, cy: 92, r: 4 },
  reflection: { cx: 100, cy: 146, rx: 48, ry: 6 },
  shadow: { cx: 100, cy: 162, rx: 62, ry: 7 },
  bandFrom: 128,
};

export const SLIME_FACE: {
  /** Open eyes (the default): dark ovals. */
  eyes: Ellipse[];
  /** White catchlights, up and to the left of each eye. */
  catchlights: Circle[];
  /** Happy closed arcs (stroke 4, round caps). */
  happyEyes: string[];
  /** Worried: flat slanted lines. */
  worriedEyes: string[];
  /** Sage: calm, closed, gently curved lines. */
  sageEyes: string[];
  mouth: string;
  worriedMouth: string;
  blush: Ellipse[];
  /** Worried sweat drop at (152, 70). */
  sweat: string;
} = {
  eyes: [
    { cx: 80, cy: 106, rx: 6, ry: 9 },
    { cx: 120, cy: 106, rx: 6, ry: 9 },
  ],
  catchlights: [
    { cx: 77.8, cy: 101.8, r: 2 },
    { cx: 117.8, cy: 101.8, r: 2 },
  ],
  happyEyes: ["M72 108 Q80 99 88 108", "M112 108 Q120 99 128 108"],
  worriedEyes: ["M73 103.5 L87 107", "M113 107 L127 103.5"],
  sageEyes: ["M72 105 Q80 111 88 105", "M112 105 Q120 111 128 105"],
  mouth: "M94 122 Q100 127 106 122",
  worriedMouth: "M95 125 Q100 121.5 105 125",
  blush: [
    { cx: 64, cy: 120, rx: 8, ry: 4 },
    { cx: 136, cy: 120, rx: 8, ry: 4 },
  ],
  sweat: "M152 61 C155.5 66 158 69.5 158 73 A6 6 0 0 1 146 73 C146 69.5 148.5 66 152 61 Z",
};

/** Evolution accessories (see lib/landing.ts#evolutionTier). */
export const SLIME_ACCESSORIES = {
  /** Named Slime: a four-point star twinkling by the tip. */
  star: fourPointStar(138, 20, 9),
  /** Demon Slime and up: a dashed magicule aura. */
  aura: { cx: 100, cy: 94, r: 92, dash: "2 6" },
  /** Demon Lord: a small gold crown perched on the tip. */
  crown: {
    path: "M97 23 L99 8 L105 15.5 L110 3 L115 15.5 L121 8 L123 23 Z",
    band: "M97.6 19 L122.4 19",
    gems: [
      { cx: 99, cy: 8, r: 1.8 },
      { cx: 110, cy: 3, r: 2.2 },
      { cx: 121, cy: 8, r: 1.8 },
    ],
    transform: "rotate(12 110 16)",
  },
} as const;

function fourPointStar(cx: number, cy: number, r: number) {
  return (
    `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} ` +
    `Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} ` +
    `Q${cx} ${cy} ${cx} ${cy - r} Z`
  );
}

const ellipse = ({ cx, cy, rx, ry }: Ellipse, attrs: string) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`;

/**
 * A standalone `<svg xmlns>` string of the slime: no CSS variables, classes
 * or animation, so it is safe for next/og (resvg) and data URIs.
 */
export function slimeSvgMarkup(
  opts: { mood?: "idle" | "happy"; size?: number } = {}
): string {
  const { mood = "idle", size = 200 } = opts;
  const { gloss, sparkle, reflection, shadow, bandFrom } = SLIME_DETAILS;
  const c = SLIME_COLORS;
  const stops = SLIME_GRADIENT_STOPS.map(
    (stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`
  ).join("");

  const eyes =
    mood === "happy"
      ? SLIME_FACE.happyEyes
          .map(
            (d) =>
              `<path d="${d}" fill="none" stroke="${c.eye}" stroke-width="4" stroke-linecap="round"/>`
          )
          .join("")
      : SLIME_FACE.eyes.map((eye) => ellipse(eye, `fill="${c.eye}"`)).join("") +
        SLIME_FACE.catchlights
          .map(({ cx, cy, r }) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>`)
          .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SLIME_VIEWBOX}" width="${size}" height="${slimeHeight(size)}">`,
    `<defs>`,
    `<radialGradient id="kv-body" cx="${SLIME_GRADIENT.cx}" cy="${SLIME_GRADIENT.cy}" r="${SLIME_GRADIENT.r}">${stops}</radialGradient>`,
    `<radialGradient id="kv-gloss"><stop offset="0%" stop-color="#fff" stop-opacity="0.75"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="kv-shadow"><stop offset="0%" stop-color="#06101f" stop-opacity="0.55"/><stop offset="100%" stop-color="#06101f" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="kv-band" x1="0" y1="${bandFrom}" x2="0" y2="158" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${c.baseBand}" stop-opacity="0"/><stop offset="100%" stop-color="${c.baseBand}" stop-opacity="0.5"/></linearGradient>`,
    `<clipPath id="kv-clip"><path d="${SLIME_BODY_PATH}"/></clipPath>`,
    `</defs>`,
    ellipse(shadow, `fill="url(#kv-shadow)"`),
    `<path d="${SLIME_BODY_PATH}" fill="url(#kv-body)"/>`,
    `<rect x="0" y="${bandFrom}" width="200" height="${158 - bandFrom}" fill="url(#kv-band)" clip-path="url(#kv-clip)"/>`,
    ellipse(
      gloss,
      `fill="url(#kv-gloss)" transform="rotate(${gloss.rotate} ${gloss.cx} ${gloss.cy})"`
    ),
    `<circle cx="${sparkle.cx}" cy="${sparkle.cy}" r="${sparkle.r}" fill="#fff" fill-opacity="0.8"/>`,
    ellipse(reflection, `fill="${c.rim}" fill-opacity="0.25"`),
    `<path d="${SLIME_BODY_PATH}" fill="none" stroke="${c.rim}" stroke-opacity="0.5" stroke-width="1.5"/>`,
    eyes,
    `<path d="${SLIME_FACE.mouth}" fill="none" stroke="${c.eye}" stroke-width="2.5" stroke-linecap="round"/>`,
    SLIME_FACE.blush
      .map((blush) =>
        ellipse(blush, `fill="${c.blush}" fill-opacity="${mood === "happy" ? 0.5 : 0.3}"`)
      )
      .join(""),
    `</svg>`,
  ].join("");
}
