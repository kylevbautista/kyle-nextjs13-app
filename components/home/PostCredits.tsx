import type { CSSProperties } from "react";
import { SageLine } from "./SageLine";

const WORDS = [
  { word: "I", delay: "0ms" },
  { word: "am", delay: "450ms" },
  { word: "atomic", delay: "900ms" },
];

/**
 * The owner's "I / am / atomic" easter egg, kept as a post-credits scene
 * below the final CTA. Animation comes entirely from Reveal (data-reveal)
 * and globals.css: the words slide in once, then a violet ring ripples out.
 * No-JS and reduced-motion visitors see everything, static.
 */
export default function PostCredits() {
  return (
    <section
      aria-label="Post-credits scene"
      data-reveal=""
      className="relative isolate flex min-h-[70svh] flex-col items-center justify-center gap-6 overflow-x-clip px-4 pb-24 pt-16 [contain:inline-size]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,#050915,transparent_75%)]"
      />
      <SageLine kind="Warning" size="sm">
        An unidentified shadow is watching.
      </SageLine>
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden="true"
          className="atomic-ring pointer-events-none absolute left-1/2 top-1/2 -ml-24 -mt-24 h-48 w-48 rounded-full border-2 border-violet-400/70 shadow-[0_0_40px_rgba(139,92,246,.45)]"
        />
        <p className="flex flex-col items-center text-center text-7xl leading-[1.05] text-white [text-shadow:0_0_40px_rgba(139,92,246,.45)] sm:text-8xl md:text-9xl">
          {WORDS.map(({ word, delay }) => (
            <span
              key={word}
              aria-hidden="true"
              className="atomic-word block max-w-full break-words"
              style={{ "--d": delay } as CSSProperties}
            >
              {word}
            </span>
          ))}
          <span className="sr-only">I am atomic.</span>
        </p>
      </div>
    </section>
  );
}
