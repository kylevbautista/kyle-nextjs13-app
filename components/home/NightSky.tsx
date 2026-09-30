import type { CSSProperties } from "react";
import { PauseParentWhenOffscreen } from "./Reveal";

/**
 * The Jura forest at night: layered, server-rendered decor for the hero and
 * the #quests bookend. Everything is CSS gradients, box-shadows and inline
 * SVG (no raster, no filter: blur), aria-hidden and pointer-events: none.
 *
 * Star and magicule positions are generated ONCE at module scope from a
 * seeded PRNG, so every render (and every regeneration) is identical and
 * nothing random happens during render.
 */

/** mulberry32: a tiny deterministic PRNG. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1234);

/** Stars live in the top ~65% of the section; y offsets are px, x offsets vw. */
const STAR_FIELD_PX = 500;

const star = (color: string, blur = 0, spread = 0) =>
  `${(rand() * 100).toFixed(2)}vw ${Math.round(rand() * STAR_FIELD_PX)}px ${blur}px ${spread}px ${color}`;

const DIM_STARS = Array.from({ length: 70 }, () => star("rgba(255,255,255,.55)")).join(",");
const BRIGHT_STARS_A = Array.from({ length: 12 }, () => star("rgba(223,241,255,.95)", 2, 0.5)).join(",");
const BRIGHT_STARS_B = Array.from({ length: 12 }, () => star("rgba(223,241,255,.95)", 2, 0.5)).join(",");

const VIOLET_MAGICULES = new Set([3, 9, 14]);
const MAGICULES = Array.from({ length: 18 }, (_, index) => ({
  left: 3 + rand() * 94,
  bottom: 8 + rand() * 48,
  size: 2 + Math.round(rand() * 3),
  color: VIOLET_MAGICULES.has(index) ? "#c4b5fd" : rand() < 0.55 ? "#95ccff" : "#bfe6ff",
  duration: 9 + rand() * 7,
  delay: -(rand() * 16),
}));

/* ------------------------------------------------------------------------- */
/* Forest: three pine ridgelines, each a seamless repeating tile.            */

const FOREST_HEIGHT = 140;
const FOREST_WIDTH = 3000;

interface RidgeSpec {
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
function ridgePath({ seed, tile, base, amp, minTree, maxTree, gap }: RidgeSpec) {
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

const RIDGES = {
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

type RidgeName = keyof typeof RIDGES;

function Ridge({ name, variant }: { name: RidgeName; variant: string }) {
  const ridge = RIDGES[name];
  const patternId = `forest-${variant}-${name}`;
  return (
    <svg
      viewBox={`0 0 ${FOREST_WIDTH} ${FOREST_HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width={ridge.tile} height={FOREST_HEIGHT} patternUnits="userSpaceOnUse">
          <path d={ridge.d} fill={ridge.color} />
        </pattern>
      </defs>
      <rect width={FOREST_WIDTH} height={FOREST_HEIGHT} fill={`url(#${patternId})`} />
    </svg>
  );
}

function Forest({ variant }: { variant: "hero" | "finale" }) {
  const hero = variant === "hero";
  return (
    // The finale's band is lower so it stays under the Quest Log's last card,
    // and only the hero's layers parallax (the timeline is the page scroll's
    // first 100vh, which the finale never sees).
    <div className={`absolute inset-x-0 bottom-0 ${hero ? "h-[90px] sm:h-[140px]" : "h-[64px] sm:h-[96px]"}`}>
      <div className={`${hero ? "forest-far " : ""}absolute inset-0`}>
        <Ridge name="far" variant={variant} />
      </div>
      <div className="absolute inset-0">
        <Ridge name="mid" variant={variant} />
      </div>
      {/* The near layer extends below the band so parallax never opens a gap. */}
      <div className={`${hero ? "forest-near " : ""}absolute inset-x-0 -bottom-10 top-0`}>
        <div className="absolute inset-x-0 bottom-10 top-0">
          <Ridge name="near" variant={variant} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#081020]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[rgb(18,18,18)]" />
    </div>
  );
}

/* ------------------------------------------------------------------------- */

const SKY: Record<"hero" | "finale", string> = {
  hero: "linear-gradient(180deg,#050915 0%,#0a1428 45%,#0e1d33 70%,rgb(18,18,18) 100%)",
  finale:
    "linear-gradient(180deg,rgb(18,18,18) 0%,#0a1428 16%,#050915 50%,#0e1d33 82%,rgb(18,18,18) 100%)",
};

export default function NightSky({ variant }: { variant: "hero" | "finale" }) {
  const hero = variant === "hero";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ backgroundImage: SKY[variant] }}
    >
      {/* The hero pauses via HeroSlime's observer; the finale pauses itself. */}
      {!hero && <PauseParentWhenOffscreen />}
      {/* Starfield: two 1px elements carrying every star as a box-shadow. */}
      <div className="absolute inset-x-0 top-0 h-[65%] overflow-hidden">
        <span className="absolute left-0 top-0 h-px w-px" style={{ boxShadow: DIM_STARS }} />
        <span
          className="absolute left-0 top-0 h-[1.5px] w-[1.5px] animate-twinkle"
          style={{ boxShadow: BRIGHT_STARS_A }}
        />
        <span
          className="absolute left-0 top-0 h-[1.5px] w-[1.5px] animate-twinkle [animation-delay:-3.5s]"
          style={{ boxShadow: BRIGHT_STARS_B }}
        />
      </div>

      {/* The moon (640px and up; on phones Hero puts a 44px moon behind the slime,
          where this position would collide with it). */}
      {hero && (
        <div className="absolute right-[8%] top-[12%] hidden h-[72px] w-[72px] rounded-full bg-[radial-gradient(circle_at_62%_58%,rgba(160,190,230,.35)_0_9%,transparent_10%),radial-gradient(circle_at_40%_70%,rgba(160,190,230,.25)_0_6%,transparent_7%),radial-gradient(circle_at_35%_35%,#f4f9ff,#cfe3ff)] shadow-[0_0_60px_10px_rgba(191,230,255,.25)] sm:block" />
      )}

      {/* "Storm Dragon" aurora: skewed radial ellipses, gradients only. */}
      <div className="absolute -left-[10%] -top-[8%] h-[42%] w-[75%] [transform:skewY(-12deg)] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.18),transparent_68%)]" />
      <div className="absolute -right-[12%] top-[2%] h-[36%] w-[70%] [transform:skewY(-12deg)] bg-[radial-gradient(ellipse_at_center,rgba(93,174,241,.20),transparent_68%)]" />

      {hero && (
        <div className="absolute inset-0 bg-[radial-gradient(240px_circle_at_var(--mx,-999px)_var(--my,-999px),rgba(149,204,255,.10),transparent_70%)]" />
      )}

      {MAGICULES.map((m, index) => (
        <span
          key={index}
          className={`absolute rounded-full opacity-40 animate-magicule-rise ${
            index >= 10 ? "hidden sm:block" : ""
          }`}
          style={
            {
              left: `${m.left.toFixed(2)}%`,
              bottom: `${m.bottom.toFixed(2)}%`,
              width: m.size,
              height: m.size,
              color: m.color,
              backgroundColor: "currentColor",
              boxShadow: "0 0 8px currentColor",
              animationDuration: `${m.duration.toFixed(1)}s`,
              animationDelay: `${m.delay.toFixed(1)}s`,
            } satisfies CSSProperties
          }
        />
      ))}

      <Forest variant={variant} />
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Magic circle: original geometry (rings, ticks, hexagram, rune marks).     */

/** Six original three-stroke geometric marks, drawn in a 12 × 12 box. */
const RUNES = [
  "M0 -6L0 6M-5 -2L0 -6M0 2L5 6",
  "M-5 -6L5 -6M0 -6L0 6M-4 3L4 6",
  "M-5 6L0 -6M0 -6L5 6M-2 2L2 6",
  "M-5 -5L5 5M-5 5L0 0M2 -6L6 -2",
  "M-6 0L6 0M-3 -6L-3 0M3 0L3 6",
  "M-4 -6L4 -6M-4 -6L-4 6M-4 1L4 6",
];

const HEXAGRAM =
  "M0 -120L103.92 60L-103.92 60Z M0 120L-103.92 -60L103.92 -60Z";

const CENTER: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

/**
 * `full` (the hero, behind the slime) turns once every 90 s while its inner
 * ring counter-rotates over 120 s. `ring` (the FAQ header) is the outer ring
 * and ticks only, turning once every 40 s. Aria-hidden.
 */
export function MagicCircle({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "ring";
  className?: string;
}) {
  const full = variant === "full";
  return (
    <svg viewBox="-160 -160 320 320" aria-hidden="true" focusable="false" className={className}>
      <g
        className={
          full
            ? "animate-spin-slow"
            : "animate-[spin-slow_40s_linear_infinite]"
        }
        style={CENTER}
        fill="none"
        stroke="#95ccff"
      >
        <circle r="150" strokeOpacity={0.35} strokeWidth={1.5} />
        {/* 48 ticks as dashes (circumference / 48), every 4th longer. */}
        <circle r="145" strokeOpacity={0.35} strokeWidth={6} strokeDasharray="1.2 17.78" />
        <circle r="143" strokeOpacity={0.3} strokeWidth={10} strokeDasharray="1.4 73.47" />
        {full && (
          <>
            <path d={HEXAGRAM} strokeOpacity={0.18} strokeWidth={1.25} strokeLinejoin="round" />
            {RUNES.map((d, index) => (
              <g key={d} transform={`rotate(${30 + index * 60}) translate(0 -132)`}>
                <path d={d} strokeOpacity={0.4} strokeWidth={1.5} strokeLinecap="round" />
              </g>
            ))}
            <g className="animate-spin-slower-reverse" style={CENTER}>
              <circle r="120" strokeOpacity={0.5} strokeWidth={1.25} strokeDasharray="2 7" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
