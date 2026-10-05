/* eslint-disable @next/next/no-img-element -- next/og (Satori) renders plain <img> from data URIs */
import { mulberry32, treelineSvgMarkup } from "@/components/home/skyArt";

/*
 * The share images' night sky (components/og): the landing card's gradient
 * and stars, the banners' aurora and forest. Satori can't render a component
 * that returns an array, so the helpers are called as functions in children.
 */

export const svgDataUri = (markup: string) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;

/** The landing share image's sky; every share image is drawn on it. */
export const OG_SKY_GRADIENT = "linear-gradient(180deg, #050915 0%, #0a1428 55%, #0e1d33 100%)";

const rand = mulberry32(1234);
/**
 * 40 seeded stars, a copy of app/(home)/opengraph-image.tsx's (same seed, same draw order). That file stays
 * untouched on purpose: any edit changes its og:image hash, and every unfurler would re-fetch the landing image.
 */
export const OG_STARS = Array.from({ length: 40 }, () => ({
  x: Math.round(rand() * 1200),
  y: Math.round(rand() * 420),
  r: rand() < 0.25 ? 3 : 2,
  o: 0.35 + rand() * 0.55,
}));

/** Call as ogStars() (Satori can't render a component that returns an array). */
export function ogStars() {
  return OG_STARS.map((star, index) => (
    <div
      key={index}
      style={{
        position: "absolute",
        left: star.x,
        top: star.y,
        width: star.r,
        height: star.r,
        borderRadius: star.r,
        backgroundColor: `rgba(223, 241, 255, ${star.o.toFixed(2)})`,
      }}
    />
  ));
}

/** The banners' "Storm Dragon" aurora (violet left, blue right), without the skew. Call as ogAurora(). */
export function ogAurora() {
  return [
    <div
      key="violet"
      style={{
        position: "absolute",
        left: -120,
        top: -60,
        width: 900,
        height: 300,
        backgroundImage: "radial-gradient(ellipse, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0) 68%)",
      }}
    />,
    <div
      key="blue"
      style={{
        position: "absolute",
        left: 500,
        top: -10,
        width: 840,
        height: 260,
        backgroundImage: "radial-gradient(ellipse, rgba(93, 174, 241, 0.16) 0%, rgba(93, 174, 241, 0) 68%)",
      }}
    />,
  ];
}

const TREELINE_SRC = svgDataUri(treelineSvgMarkup(1200, 64));

/** The banners' forest along the bottom (1200×64). Call as ogTreeline(). */
export function ogTreeline() {
  return <img src={TREELINE_SRC} alt="" width={1200} height={64} style={{ position: "absolute", left: 0, top: 566 }} />;
}
