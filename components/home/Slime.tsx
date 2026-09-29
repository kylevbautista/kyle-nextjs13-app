import { useId, type CSSProperties } from "react";
import type { EvolutionTier } from "@/lib/landing";
import { PauseWhenOffscreen, SlimeGulp } from "./Reveal";
import {
  SLIME_ACCESSORIES,
  SLIME_BODY_PATH,
  SLIME_COLORS,
  SLIME_DETAILS,
  SLIME_FACE,
  SLIME_GRADIENT,
  SLIME_GRADIENT_STOPS,
  SLIME_PIVOT,
  SLIME_VIEWBOX,
  slimeHeight,
} from "./slimeArt";

export type SlimeMood = "idle" | "happy" | "worried" | "sage";

interface SlimeProps {
  /** Rendered width in px; the height is round(size × 0.85). */
  size: number;
  mood?: SlimeMood;
  /** Evolution accessories: gold rim + star, aura, crown. */
  tier?: EvolutionTier;
  /** Idle jiggle and blink (motion-safe, paused offscreen). Default true. */
  animated?: boolean;
  /**
   * Changing it replays the gulp (a re-keyed <g>), e.g. the list count. The
   * first value never gulps and a number going down doesn't either. Needs
   * `animated`.
   */
  gulpKey?: string | number;
  /** Pupils rest looking left (the Magic Sense end card). */
  lookLeft?: boolean;
  className?: string;
}

const PIVOT: CSSProperties = { transformBox: "view-box", transformOrigin: SLIME_PIVOT };
const CENTER: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

/**
 * The kylevb mascot: an original glossy slime (geometry in ./slimeArt.ts).
 * Presentational and hook-free apart from useId, so it renders from server
 * and client components alike; the stateful bits (offscreen pausing, the
 * gulp replay) are client leaves from ./Reveal. Always aria-hidden.
 *
 * Class hooks for CSS: .slime-hop (the hero's wake), .slime-eyes-open,
 * .slime-eyes-happy (swapped by the hero's :has() rule and during a gulp,
 * .slime-gulping) and .slime-pupils (reads --look-x / --look-y).
 */
export default function Slime({
  size,
  mood = "idle",
  tier = "slime",
  animated = true,
  gulpKey,
  lookLeft = false,
  className,
}: SlimeProps) {
  // useId() may contain characters that break url(#…) references.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `slime-${name}-${uid}`;
  const c = SLIME_COLORS;
  const { gloss, sparkle, reflection, shadow, bandFrom } = SLIME_DETAILS;
  const named = tier !== "slime";
  const hasAura = tier === "demon" || tier === "lord";
  const blush = mood === "happy" ? 0.5 : mood === "worried" ? 0.2 : 0.3;

  const body = (
    <g className={animated ? "motion-safe:animate-slime-jiggle" : undefined} style={PIVOT}>
      <path d={SLIME_BODY_PATH} fill={`url(#${id("body")})`} />
      <rect
        x="0"
        y={bandFrom}
        width="200"
        height={158 - bandFrom}
        fill={`url(#${id("band")})`}
        clipPath={`url(#${id("clip")})`}
      />
      <ellipse
        cx={gloss.cx}
        cy={gloss.cy}
        rx={gloss.rx}
        ry={gloss.ry}
        transform={`rotate(${gloss.rotate} ${gloss.cx} ${gloss.cy})`}
        fill={`url(#${id("gloss")})`}
      />
      <circle cx={sparkle.cx} cy={sparkle.cy} r={sparkle.r} fill="#fff" fillOpacity={0.8} />
      <ellipse
        cx={reflection.cx}
        cy={reflection.cy}
        rx={reflection.rx}
        ry={reflection.ry}
        fill={c.rim}
        fillOpacity={0.25}
      />
      <path
        d={SLIME_BODY_PATH}
        fill="none"
        stroke={named ? c.rimNamed : c.rim}
        strokeOpacity={named ? 0.7 : 0.5}
        strokeWidth={1.5}
      />

      <Face mood={mood} animated={animated} />

      {SLIME_FACE.blush.map((b) => (
        <ellipse key={b.cx} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={c.blush} fillOpacity={blush} />
      ))}

      {/* Evolution accessories ride on the body, so they squash with it. */}
      {(tier === "named" || tier === "demon") && (
        <g className="motion-safe:animate-fade-in">
          <path
            d={SLIME_ACCESSORIES.star}
            fill={c.gold}
            className={animated ? "motion-safe:animate-twinkle" : undefined}
          />
        </g>
      )}

      {tier === "lord" && (
        <g className="motion-safe:animate-fade-in">
          <g transform={SLIME_ACCESSORIES.crown.transform}>
            <path
              d={SLIME_ACCESSORIES.crown.path}
              fill={c.gold}
              stroke={c.goldStroke}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <path d={SLIME_ACCESSORIES.crown.band} stroke={c.goldStroke} strokeWidth={1.25} />
            {SLIME_ACCESSORIES.crown.gems.map((gem) => (
              <circle key={gem.cx} cx={gem.cx} cy={gem.cy} r={gem.r} fill="#fff3c4" />
            ))}
          </g>
        </g>
      )}
    </g>
  );

  return (
    <svg
      viewBox={SLIME_VIEWBOX}
      width={size}
      height={slimeHeight(size)}
      overflow="visible"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={lookLeft ? ({ "--look-x": "-1" } as CSSProperties) : undefined}
    >
      <defs>
        <radialGradient id={id("body")} cx={SLIME_GRADIENT.cx} cy={SLIME_GRADIENT.cy} r={SLIME_GRADIENT.r}>
          {SLIME_GRADIENT_STOPS.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
        <radialGradient id={id("gloss")}>
          <stop offset="0%" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id("shadow")}>
          <stop offset="0%" stopColor="#06101f" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#06101f" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id("band")} x1="0" y1={bandFrom} x2="0" y2="158" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.baseBand} stopOpacity={0} />
          <stop offset="100%" stopColor={c.baseBand} stopOpacity={0.5} />
        </linearGradient>
        <clipPath id={id("clip")}>
          <path d={SLIME_BODY_PATH} />
        </clipPath>
      </defs>

      {animated && <PauseWhenOffscreen />}

      <ellipse
        cx={shadow.cx}
        cy={shadow.cy}
        rx={shadow.rx}
        ry={shadow.ry}
        fill={`url(#${id("shadow")})`}
      />

      {hasAura && (
        <g className="motion-safe:animate-fade-in">
          <circle
            cx={SLIME_ACCESSORIES.aura.cx}
            cy={SLIME_ACCESSORIES.aura.cy}
            r={SLIME_ACCESSORIES.aura.r}
            fill="none"
            stroke={c.aura}
            strokeOpacity={0.6}
            strokeWidth={1.75}
            strokeDasharray={SLIME_ACCESSORIES.aura.dash}
            strokeLinecap="round"
            className={animated ? "motion-safe:animate-[spin-slow_20s_linear_infinite]" : undefined}
            style={CENTER}
          />
        </g>
      )}

      <g className="slime-hop" style={PIVOT}>
        {animated ? (
          <SlimeGulp gulpKey={gulpKey} style={PIVOT}>
            {body}
          </SlimeGulp>
        ) : (
          body
        )}
      </g>
    </svg>
  );
}

function Face({ mood, animated }: { mood: SlimeMood; animated: boolean }) {
  const eye = SLIME_COLORS.eye;
  const mouth = (
    <path
      d={mood === "worried" ? SLIME_FACE.worriedMouth : SLIME_FACE.mouth}
      fill="none"
      stroke={eye}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  );

  if (mood === "worried" || mood === "sage") {
    const lines = mood === "worried" ? SLIME_FACE.worriedEyes : SLIME_FACE.sageEyes;
    return (
      <g>
        {lines.map((d) => (
          <path key={d} d={d} fill="none" stroke={eye} strokeWidth={mood === "worried" ? 4 : 3.5} strokeLinecap="round" />
        ))}
        {mouth}
        {mood === "worried" && <path d={SLIME_FACE.sweat} fill={SLIME_COLORS.sweat} fillOpacity={0.9} />}
      </g>
    );
  }

  const happy = mood === "happy";
  return (
    <g>
      {/* Both eye sets are always present so CSS can swap them (opacity
          attributes lose to any CSS rule, e.g. the hero's :has()). */}
      <g className="slime-eyes-open" opacity={happy ? 0 : 1}>
        <g className="slime-pupils">
          <g className={animated ? "motion-safe:animate-slime-blink" : undefined} style={CENTER}>
            {SLIME_FACE.eyes.map((e) => (
              <ellipse key={e.cx} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={eye} />
            ))}
            {SLIME_FACE.catchlights.map((l) => (
              <circle key={l.cx} cx={l.cx} cy={l.cy} r={l.r} fill="#fff" />
            ))}
          </g>
        </g>
      </g>
      <g className="slime-eyes-happy" opacity={happy ? 1 : 0}>
        {SLIME_FACE.happyEyes.map((d) => (
          <path key={d} d={d} fill="none" stroke={eye} strokeWidth={4} strokeLinecap="round" />
        ))}
      </g>
      {mouth}
    </g>
  );
}
