import type { CSSProperties } from "react";

/**
 * An AniList cover that stays sharp on every screen without always shipping
 * the biggest file. AniList serves each cover at three widths (the path says
 * which): /cover/small/ ≈ 100px, /cover/medium/ ≈ 230px, /cover/large/ ≈ 460px
 * (the GraphQL fields medium, large and extraLarge). This lists them as a
 * `srcset`, so with `sizes` the browser picks the smallest file that covers
 * the rendered width × the screen's pixel ratio.
 *
 * Why a plain <img>: images.unoptimized is on (no Vercel resizing costs), and
 * next/image emits no srcset when unoptimized, so every card got one fixed
 * file: the landing's 262px cards showed the 230px file, soft even at 1×.
 *
 * Some new shows only have the 230px upload (their extraLarge points at
 * /cover/medium/); widths come from the URL, so they're listed honestly.
 */

const WIDTH_BY_PATH: Record<string, number> = { small: 100, medium: 230, large: 460 };

/** AniList's real width for a cover URL, or null for anything else. */
export function anilistCoverWidth(url: string): number | null {
  const match = url.match(/\/media\/anime\/cover\/(small|medium|large)\//);
  return match ? WIDTH_BY_PATH[match[1]] : null;
}

/** "url 230w, url 460w" from whichever sizes exist, smallest first; null when none parse. */
export function anilistSrcSet(urls: readonly (string | null | undefined)[]): string | null {
  const byWidth = new Map<number, string>();
  for (const url of urls) {
    if (!url) continue;
    const width = anilistCoverWidth(url);
    if (width !== null && !byWidth.has(width)) byWidth.set(width, url);
  }
  if (!byWidth.size) return null;
  return [...byWidth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([width, url]) => `${url} ${width}w`)
    .join(", ");
}

export default function AniListCover({
  urls,
  sizes,
  alt = "",
  loading = "lazy",
  className = "",
  style,
}: {
  /** Any of the cover's URLs (medium, large, extraLarge), in any order. */
  urls: readonly (string | null | undefined)[];
  /** The rendered width, as for <img sizes>: "(min-width: 1024px) 262px, 45vw". */
  sizes: string;
  alt?: string;
  loading?: "lazy" | "eager";
  className?: string;
  style?: CSSProperties;
}) {
  const srcSet = anilistSrcSet(urls);
  // The largest file as the fallback src (browsers without srcset, or unknown URLs).
  const src =
    [...urls]
      .filter((url): url is string => !!url)
      .sort((a, b) => (anilistCoverWidth(b) ?? 0) - (anilistCoverWidth(a) ?? 0))[0] ?? null;
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image can't emit a srcset with images.unoptimized
    <img
      src={src}
      srcSet={srcSet ?? undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      style={style}
    />
  );
}
