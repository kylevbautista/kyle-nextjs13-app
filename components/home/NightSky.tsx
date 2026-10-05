import type { CSSProperties } from "react";
import { PauseParentWhenOffscreen } from "./Reveal";
import {
  FOREST_HEIGHT,
  HEXAGRAM,
  MAGIC_CIRCLE_HEXAGRAM,
  MAGIC_CIRCLE_INNER,
  MAGIC_CIRCLE_OUTER,
  MAGIC_CIRCLE_RUNE,
  RIDGES,
  RUNES,
  mulberry32,
  runeTransform,
} from "./skyArt";

/**
 * The Jura forest at night: layered, server-rendered decor for the hero, the
 * #quests bookend, app-page banners (`page`, components/theme/PageBanner) and the
 * site footer's treeline (`Treeline`). Everything is CSS gradients, box-shadows and inline
 * SVG (no raster, no filter: blur), aria-hidden and pointer-events: none.
 *
 * Star and magicule positions are generated ONCE at module scope from a
 * seeded PRNG, so every render (and every regeneration) is identical and
 * nothing random happens during render.
 */

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

const FOREST_WIDTH = 3000;

type RidgeName = keyof typeof RIDGES;

function Ridge({
  name,
  variant,
  width = FOREST_WIDTH,
}: {
  name: RidgeName;
  variant: string;
  /** The viewBox (and pattern rect) width; the ridges tile seamlessly at any width. */
  width?: number;
}) {
  const ridge = RIDGES[name];
  const patternId = `forest-${variant}-${name}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${FOREST_HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width={ridge.tile} height={FOREST_HEIGHT} patternUnits="userSpaceOnUse">
          <path d={ridge.d} fill={ridge.color} />
        </pattern>
      </defs>
      <rect width={width} height={FOREST_HEIGHT} fill={`url(#${patternId})`} />
    </svg>
  );
}

type SkyVariant = "hero" | "finale" | "page";

const FOREST_BAND: Record<SkyVariant, string> = {
  hero: "h-[90px] sm:h-[140px]",
  finale: "h-[64px] sm:h-[96px]",
  page: "h-[44px] sm:h-[64px]",
};

/**
 * The viewBox width per band. "xMidYMax slice" scales a ridge by the larger of width / viewBox and
 * height / 140; once it scales by width, the top of the viewBox is cut off, and past the tallest pine's
 * headroom (it reaches y = 33) their tops turn flat. The hero's 140px band is height-scaled up to 3000px.
 * The banners' 64px band and the finale's 96px one use 7360: height-scaled up to ≈ 3365px and ≈ 5047px,
 * flat tops only past ≈ 4400px and ≈ 6600px (with 3000 the banners' cut flat past ≈ 1800px).
 * A different width doesn't make the footer's treeline differ from a banner's: two bands of the same
 * height (44 / 64px) are scaled alike, so another width only slides all three ridges together. The
 * footer's treeline is mirrored instead (FOOTER_TREELINE in components/theme/tokens.ts).
 */
const BANNER_FOREST_WIDTH = 7360;
const FOREST_VIEWBOX: Record<SkyVariant, number> = {
  hero: FOREST_WIDTH,
  finale: BANNER_FOREST_WIDTH,
  page: BANNER_FOREST_WIDTH,
};

function Forest({ variant }: { variant: SkyVariant }) {
  const hero = variant === "hero";
  return (
    // The finale's band is lower so it stays under the Quest Log's last card,
    // a page banner's lower still, and only the hero's layers parallax (the
    // timeline is the page scroll's first 100vh, which the others never see).
    <div className={`absolute inset-x-0 bottom-0 ${FOREST_BAND[variant]}`}>
      <div className={`${hero ? "forest-far " : ""}absolute inset-0`}>
        <Ridge name="far" variant={variant} width={FOREST_VIEWBOX[variant]} />
      </div>
      <div className="absolute inset-0">
        <Ridge name="mid" variant={variant} width={FOREST_VIEWBOX[variant]} />
      </div>
      {/* The near layer extends below the band so parallax never opens a gap. */}
      <div className={`${hero ? "forest-near " : ""}absolute inset-x-0 -bottom-10 top-0`}>
        <div className="absolute inset-x-0 bottom-10 top-0">
          <Ridge name="near" variant={variant} width={FOREST_VIEWBOX[variant]} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#081020]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[rgb(18,18,18)]" />
    </div>
  );
}

/**
 * The footer's viewBox width. "xMidYMax slice" scales a ridge by the larger of width / viewBox and
 * height / 140: at 7000 the 64px band stays height-scaled up to ≈ 3200px, and its tallest pines stay
 * pointed up to ≈ 4200px. On a short page it is not a copy of the banner's treeline above it because
 * SiteFooter mirrors it (FOOTER_TREELINE), not because of this width.
 */
const TREELINE_WIDTH = 7000;

/**
 * The forest alone, static (no parallax, no fade into the page): the site footer's treeline
 * (components/common/SiteFooter.tsx). Hook-free, so the server root layout renders it. Its
 * pattern ids are `forest-footer-*`: render it once per page.
 */
export function Treeline({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      {(["far", "mid", "near"] as const).map((name) => (
        <div key={name} className="absolute inset-0">
          <Ridge name={name} variant="footer" width={TREELINE_WIDTH} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

const SKY: Record<SkyVariant, string> = {
  hero: "linear-gradient(180deg,#050915 0%,#0a1428 45%,#0e1d33 70%,rgb(18,18,18) 100%)",
  finale:
    "linear-gradient(180deg,rgb(18,18,18) 0%,#0a1428 16%,#050915 50%,#0e1d33 82%,rgb(18,18,18) 100%)",
  page: "linear-gradient(180deg,#050915 0%,#0a1428 50%,#0e1d33 78%,rgb(18,18,18) 100%)",
};

/**
 * Without a forest band the sky runs down to the horizon's navy instead of fading into the page:
 * the card pages, whose forest is the footer's Treeline right below (its horizon turns the same
 * navy on those pages: FOOTER_HORIZON in components/theme/tokens.ts). CARD_PAGE paints it too.
 */
const HORIZON_SKY = "linear-gradient(180deg,#050915 0%,#0a1428 50%,#0e1d33 100%)";

/**
 * `hero`: the landing's first screen (moon, pointer glow, parallax forest).
 * `finale`: the #quests bookend. `page`: an app page's banner, a shorter band
 * with the same stars, aurora and magicules. Everything but the hero pauses
 * itself offscreen (the hero pauses via HeroSlime's observer).
 * `forest={false}`: no forest band, and the sky runs down to the horizon's navy
 * (the card pages: the footer's `Treeline` is right below, and two treelines on
 * one short screen read as a glitch).
 */
export default function NightSky({ variant, forest = true }: { variant: SkyVariant; forest?: boolean }) {
  const hero = variant === "hero";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ backgroundImage: forest ? SKY[variant] : HORIZON_SKY }}
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

      {forest && <Forest variant={variant} />}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Magic circle: original geometry (rings, ticks, hexagram, rune marks).     */

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
        {/* The outer ring, then 48 ticks as dashes (circumference / 48), every 4th longer (skyArt.ts). */}
        {MAGIC_CIRCLE_OUTER.map((ring) => (
          <circle key={ring.r} r={ring.r} strokeOpacity={ring.opacity} strokeWidth={ring.width} strokeDasharray={ring.dash} />
        ))}
        {full && (
          <>
            <path
              d={HEXAGRAM}
              strokeOpacity={MAGIC_CIRCLE_HEXAGRAM.opacity}
              strokeWidth={MAGIC_CIRCLE_HEXAGRAM.width}
              strokeLinejoin="round"
            />
            {RUNES.map((d, index) => (
              <g key={d} transform={runeTransform(index)}>
                <path d={d} strokeOpacity={MAGIC_CIRCLE_RUNE.opacity} strokeWidth={MAGIC_CIRCLE_RUNE.width} strokeLinecap="round" />
              </g>
            ))}
            <g className="animate-spin-slower-reverse" style={CENTER}>
              <circle
                r={MAGIC_CIRCLE_INNER.r}
                strokeOpacity={MAGIC_CIRCLE_INNER.opacity}
                strokeWidth={MAGIC_CIRCLE_INNER.width}
                strokeDasharray={MAGIC_CIRCLE_INNER.dash}
              />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
