import { SLIME_ACCESSORIES, SLIME_COLORS } from "@/components/home/slimeArt";

/**
 * Small gold theme icons. Hook-free and aria-hidden: they always sit next to
 * text that says the same thing.
 */

/** The laurel trophy (the landing's Top Anime doorway, /topanime's Octagram). */
export function TrophyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="#f5c451"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 8h12v6a6 6 0 0 1-12 0z" />
      <path d="M14 10H10.5a3.5 3.5 0 0 0 3.8 5M26 10h3.5a3.5 3.5 0 0 1-3.8 5" />
      <path d="M20 20v5M15.5 29h9M17 25h6l.8 4h-7.6z" />
      <path d="M8.5 32c-3-3.5-4-8.5-2.5-13M31.5 32c3-3.5 4-8.5 2.5-13" />
      <path d="M6 27.5c1.8.2 3.2 1.2 3.9 2.8M5.3 22.5c1.8.5 3 1.7 3.4 3.4M34 27.5c-1.8.2-3.2 1.2-3.9 2.8M34.7 22.5c-1.8.5-3 1.7-3.4 3.4" />
    </svg>
  );
}

/** The Demon Lord slime's crown (components/home/slimeArt.ts), upright. */
export function CrownIcon({ className = "" }: { className?: string }) {
  const { crown } = SLIME_ACCESSORIES;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="94 0 32 25" className={className}>
      <path
        d={crown.path}
        fill={SLIME_COLORS.gold}
        stroke={SLIME_COLORS.goldStroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d={crown.band} stroke={SLIME_COLORS.goldStroke} strokeWidth={1.25} />
      {crown.gems.map((gem) => (
        <circle key={gem.cx} cx={gem.cx} cy={gem.cy} r={gem.r} fill="#fff3c4" />
      ))}
    </svg>
  );
}

/** A five-point star (scores). Gold for the Octagram, sage elsewhere: pass the color class. */
export function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
