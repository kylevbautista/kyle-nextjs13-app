import type { ReactNode } from "react";

/** The Great Sage's system-message kinds, rendered as 《Kind》. */
export type SageKind = "Notice" | "Question" | "Answer" | "Report" | "Warning" | "Analyze";

const SIZE_CLASS = {
  sm: "gap-1.5 px-2.5 py-1.5 text-xs",
  md: "gap-2 px-3 py-2 text-[13px] sm:text-sm",
  lg: "gap-2 px-4 py-3 text-sm sm:text-base",
} as const;

/** Content chapters: the shared section box (hero, Tempest and #quests are full-bleed). */
// contain:inline-size: a section's content never widens the page (the body is a
// grid with an auto column, so any min-content overflow would scroll sideways).
export const CHAPTER_CLASS =
  "relative isolate mx-auto max-w-6xl scroll-mt-20 px-4 py-20 [contain:inline-size] sm:px-6 sm:py-28";
/** "Skill 01 · Magic Sense" */
export const EYEBROW_CLASS = "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#95ccff]";
/** Chapter h2. */
export const CHAPTER_TITLE_CLASS =
  "text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl laptop:text-[2.75rem]";
/** Chapter subhead. */
export const CHAPTER_SUB_CLASS = "text-base leading-7 text-[#c9d6e6] sm:text-lg";
/** The page-wide focus ring (on the page background). */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";

/** Shared console styling (also used by bubbles and panels that mimic it). */
export const SAGE_FRAME =
  "rounded-md border border-[#95ccff]/30 bg-[#0a1528]/70 font-mono text-[#cfe8ff] shadow-[0_0_24px_-8px_rgba(149,204,255,.5)]";

/**
 * A Great Sage system line: 《Notice》 Reincarnation complete.
 *
 * Screen readers hear "Great Sage notice: …"; the bracket glyphs are hidden.
 * `scan="load"` types the line in on page load; `scan="reveal"` does it the
 * first time an ancestor `[data-reveal]` enters view (see Reveal.tsx).
 * `caret` adds a blinking ▍ once the scan finishes.
 */
export function SageLine({
  kind,
  children,
  as: Tag = "p",
  size = "md",
  scan,
  caret,
  className = "",
}: {
  kind: SageKind;
  children: ReactNode;
  as?: "p" | "div" | "span";
  size?: "sm" | "md" | "lg";
  scan?: "load" | "reveal";
  caret?: boolean;
  className?: string;
}) {
  const scanClass =
    scan === "load" ? "animate-sage-scan" : scan === "reveal" ? "sage-scan-reveal" : "";
  return (
    <Tag className={`inline-flex max-w-full ${SIZE_CLASS[size]} ${SAGE_FRAME} ${scanClass} ${className}`}>
      <span className="min-w-0">
        <span className="sr-only">{`Great Sage ${kind.toLowerCase()}: `}</span>
        <span aria-hidden="true" className="mr-2 text-[#95ccff]">
          《{kind}》
        </span>
        {children}
        {caret && (
          <span
            aria-hidden="true"
            className="ml-0.5 text-[#95ccff] animate-caret [animation-delay:850ms]"
          >
            ▍
          </span>
        )}
      </span>
    </Tag>
  );
}

/** A canon skill name in 〈angle brackets〉; the brackets are not read aloud. */
export function Skill({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true">〈</span>
      {children}
      <span aria-hidden="true">〉</span>
    </>
  );
}

/** '《Notice》 text', for toasts, bubbles and other plain strings. */
export function sageText(kind: SageKind, text: string): string {
  return `《${kind}》 ${text}`;
}
