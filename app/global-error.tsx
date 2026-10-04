"use client";
import { useEffect } from "react";
import RetryButton from "@/components/theme/RetryButton";
import {
  SLIME_BODY_PATH,
  SLIME_COLORS,
  SLIME_DETAILS,
  SLIME_FACE,
  SLIME_GRADIENT,
  SLIME_GRADIENT_STOPS,
  SLIME_PIVOT,
  SLIME_VIEWBOX,
  slimeHeight,
} from "@/components/home/slimeArt";

/*
 * The whole document when the root layout fails. Dependency-light on purpose: React, RetryButton
 * and the slime's geometry (slimeArt.ts, already in the shared chunk), no next/link (Home is a full
 * document load: a root layout that throws on every render would throw again on a client navigation).
 * One <style>: hover, focus-visible, aria-disabled, the console's corner brackets, static stars, a
 * forced-colors block and the slime's jiggle. Keep this CSS free of quotes, <, > and &.
 */
const CSS = [
  ".ge{background:#121212;color-scheme:dark}",
  ".ge-body{margin:0;min-height:100vh;min-height:100dvh;box-sizing:border-box;display:grid;place-items:center;padding:24px 16px;color:#fff;text-align:center;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:radial-gradient(60% 38% at 12% 0%,rgba(139,92,246,.16),transparent 70%),radial-gradient(55% 38% at 92% 4%,rgba(93,174,241,.16),transparent 70%),linear-gradient(180deg,#050915 0%,#0a1428 50%,#0e1d33 78%,#121212 100%)}",
  ".ge-stars{position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;box-shadow:6vw 9vh rgba(255,255,255,.5),13vw 31vh rgba(223,241,255,.85),21vw 5vh rgba(255,255,255,.4),29vw 19vh rgba(255,255,255,.55),38vw 41vh rgba(223,241,255,.7),47vw 8vh rgba(255,255,255,.45),55vw 26vh rgba(255,255,255,.6),63vw 12vh rgba(223,241,255,.9),71vw 36vh rgba(255,255,255,.4),79vw 6vh rgba(255,255,255,.55),86vw 22vh rgba(223,241,255,.75),93vw 44vh rgba(255,255,255,.45),97vw 14vh rgba(255,255,255,.5),3vw 52vh rgba(255,255,255,.35)}",
  ".ge-card{position:relative;width:100%;max-width:28rem;box-sizing:border-box;padding:24px;border:1px solid rgba(149,204,255,.3);border-radius:16px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 3px),rgba(10,21,40,.85);box-shadow:inset 0 0 60px -20px rgba(149,204,255,.35),0 30px 80px -40px rgba(93,174,241,.45)}",
  ".ge-corner{position:absolute;width:12px;height:12px;pointer-events:none;border:0 solid rgba(149,204,255,.6)}",
  ".ge-tl{left:12px;top:12px;border-left-width:2px;border-top-width:2px}.ge-tr{right:12px;top:12px;border-right-width:2px;border-top-width:2px}.ge-bl{left:12px;bottom:12px;border-left-width:2px;border-bottom-width:2px}.ge-br{right:12px;bottom:12px;border-right-width:2px;border-bottom-width:2px}",
  ".ge-slime{display:block;margin:0 auto 16px}.ge-jiggle{animation:ge-jiggle 3.2s ease-in-out infinite}",
  // CARD_TITLE_CLASS by hand: tracking-tight, the moonlit gradient text (forced colors repaints it) and
  // .hero-title's solid fallback.
  ".ge-title{margin:0;padding-bottom:2px;font-size:24px;line-height:1.25;font-weight:900;letter-spacing:-.025em;background:linear-gradient(#fff,#cfe8ff);-webkit-background-clip:text;background-clip:text;color:transparent}",
  "@supports not ((-webkit-background-clip:text) or (background-clip:text)){.ge-title{background:none;color:#fff}}",
  ".ge-text{margin:16px 0 0;font-size:14px;line-height:24px;color:rgb(200,206,218);overflow-wrap:anywhere}",
  ".ge-tag{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#95ccff}",
  ".ge-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
  ".ge-id{margin:16px 0 0;font:12px/20px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:rgb(164,164,164);overflow-wrap:anywhere}.ge-id code{font:inherit;color:#cfe8ff;user-select:all}",
  ".ge-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:20px}",
  ".ge-btn{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:44px;padding:0 16px;border-radius:12px;font:inherit;font-size:14px;font-weight:600;line-height:20px;white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color .15s}",
  ".ge-primary{border:1px solid transparent;background:#2563eb;color:#fff;box-shadow:0 0 0 1px rgba(149,204,255,.35),0 10px 40px -10px rgba(59,130,246,.8)}.ge-primary:hover{background:#3b82f6}",
  ".ge-ghost{border:1px solid rgba(149,204,255,.4);background:rgba(255,255,255,.05);color:#e6f3ff}.ge-ghost:hover{background:rgba(255,255,255,.1)}",
  ".ge-btn[aria-disabled=true]{opacity:.6;cursor:not-allowed}",
  ".ge-btn:focus-visible{outline:2px solid #95ccff;outline-offset:2px}",
  "@media (min-width:640px){.ge-card{padding:32px}.ge-title{font-size:30px;line-height:36px}.ge-text{font-size:16px;line-height:28px}}",
  "@media (forced-colors:active){.ge-stars{display:none}}",
  "@keyframes ge-jiggle{0%,100%{transform:scale(1,1)}25%{transform:scale(1.03,.97)}50%{transform:scale(.985,1.02)}75%{transform:scale(1.01,.99)}}",
].join("");

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="ge">
      <body className="ge-body">
        <title>Something went wrong · kylevb</title>
        <style>{CSS}</style>
        <span aria-hidden="true" className="ge-stars" />
        <main aria-labelledby="ge-title" className="ge-card">
          <span aria-hidden="true" className="ge-corner ge-tl" />
          <span aria-hidden="true" className="ge-corner ge-tr" />
          <span aria-hidden="true" className="ge-corner ge-bl" />
          <span aria-hidden="true" className="ge-corner ge-br" />
          <FatalSlime />
          <div role="alert">
            <h1 id="ge-title" className="ge-title">
              Something went wrong
            </h1>
            <p className="ge-text">
              <span className="ge-sr">Great Sage warning: </span>
              <span aria-hidden="true" className="ge-tag">
                《Warning》
              </span>{" "}
              kylevb hit an unexpected error. Please try again.
            </p>
          </div>
          {error.digest && (
            <p className="ge-id">
              Error ID: <code>{error.digest}</code>
            </p>
          )}
          <div className="ge-actions">
            <RetryButton retry={retry} label="Try again" pendingLabel="Trying again…" className="ge-btn ge-primary" />
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full document load on purpose: a root layout that throws on every render would throw again on a client navigation */}
            <a href="/" className="ge-btn ge-ghost">
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

/**
 * The site's slime (slimeArt.ts), worried: Slime.tsx's layers in its order (shadow; body, base band,
 * gloss, sparkle, reflection, rim; worried eyes, mouth, sweat; blush). Its ids are fixed (this page
 * is the whole document), and it jiggles with its own keyframe.
 */
function FatalSlime() {
  const c = SLIME_COLORS;
  const { gloss, sparkle, reflection, shadow, bandFrom } = SLIME_DETAILS;
  const face = SLIME_FACE;
  return (
    <svg
      viewBox={SLIME_VIEWBOX}
      width={80}
      height={slimeHeight(80)}
      overflow="visible"
      aria-hidden="true"
      focusable="false"
      className="ge-slime"
    >
      <defs>
        <radialGradient id="ge-body" cx={SLIME_GRADIENT.cx} cy={SLIME_GRADIENT.cy} r={SLIME_GRADIENT.r}>
          {SLIME_GRADIENT_STOPS.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
        <radialGradient id="ge-gloss">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="ge-shadow">
          <stop offset="0%" stopColor="#06101f" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#06101f" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="ge-band" x1="0" y1={bandFrom} x2="0" y2="158" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.baseBand} stopOpacity={0} />
          <stop offset="100%" stopColor={c.baseBand} stopOpacity={0.5} />
        </linearGradient>
        <clipPath id="ge-clip">
          <path d={SLIME_BODY_PATH} />
        </clipPath>
      </defs>
      <ellipse cx={shadow.cx} cy={shadow.cy} rx={shadow.rx} ry={shadow.ry} fill="url(#ge-shadow)" />
      <g className="ge-jiggle" style={{ transformBox: "view-box", transformOrigin: SLIME_PIVOT }}>
        <path d={SLIME_BODY_PATH} fill="url(#ge-body)" />
        <rect x="0" y={bandFrom} width="200" height={158 - bandFrom} fill="url(#ge-band)" clipPath="url(#ge-clip)" />
        <ellipse
          cx={gloss.cx}
          cy={gloss.cy}
          rx={gloss.rx}
          ry={gloss.ry}
          transform={`rotate(${gloss.rotate} ${gloss.cx} ${gloss.cy})`}
          fill="url(#ge-gloss)"
        />
        <circle cx={sparkle.cx} cy={sparkle.cy} r={sparkle.r} fill="#fff" fillOpacity={0.8} />
        <ellipse cx={reflection.cx} cy={reflection.cy} rx={reflection.rx} ry={reflection.ry} fill={c.rim} fillOpacity={0.25} />
        <path d={SLIME_BODY_PATH} fill="none" stroke={c.rim} strokeOpacity={0.5} strokeWidth={1.5} />
        {face.worriedEyes.map((d) => (
          <path key={d} d={d} fill="none" stroke={c.eye} strokeWidth={4} strokeLinecap="round" />
        ))}
        <path d={face.worriedMouth} fill="none" stroke={c.eye} strokeWidth={2.5} strokeLinecap="round" />
        <path d={face.sweat} fill={c.sweat} fillOpacity={0.9} />
        {face.blush.map((b) => (
          <ellipse key={b.cx} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={c.blush} fillOpacity={0.2} />
        ))}
      </g>
    </svg>
  );
}
