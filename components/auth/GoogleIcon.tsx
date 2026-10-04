"use client";
import googleG from "./google-g.png";

/**
 * Google's "G" (the 2026 sign-in kit's gradient mark) for Google buttons and chips. Decorative.
 * A PNG: the kit draws it with a conic gradient and blur filters, which we don't inline (no
 * filter: blur in the DOM; Safari can't render the foreignObject). Statically imported, so it gets
 * a hashed, immutable /_next/static/media URL.
 *
 * "use client" on purpose: a server-rendered <img> becomes an image preload hint in the RSC
 * payload, and sign-in's static fallback renders this from a server component. The nav's Log in
 * link prefetches that page, so every signed-out page would fetch a G it never shows.
 */
export default function GoogleIcon({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed brand PNG; next/image would add ≈5.5 KB gz of client JS (images are unoptimized)
    <img
      src={googleG.src}
      alt=""
      aria-hidden="true"
      width={20}
      height={20}
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
