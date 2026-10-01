import type { ReactNode } from "react";
import { SAGE_FRAME } from "@/components/theme/tokens";

/** The Great Sage's system-message kinds, rendered as 《Kind》. */
export type SageKind = "Notice" | "Question" | "Answer" | "Report" | "Warning" | "Analyze";

const SIZE_CLASS = {
  sm: "gap-1.5 px-2.5 py-1.5 text-xs",
  md: "gap-2 px-3 py-2 text-[13px] sm:text-sm",
  lg: "gap-2 px-4 py-3 text-sm sm:text-base",
} as const;

// The chapter tokens live in the theme kit; re-exported for the landing's imports.
export {
  CHAPTER_CLASS,
  CHAPTER_SUB_CLASS,
  CHAPTER_TITLE_CLASS,
  EYEBROW_CLASS,
  FOCUS_RING,
  SAGE_FRAME,
} from "@/components/theme/tokens";

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

/** Great Sage tag for inline text: read as "Great Sage notice:", shown as 《Notice》. */
export function SageTag({ kind }: { kind: SageKind }) {
  return (
    <>
      <span className="sr-only">{`Great Sage ${kind.toLowerCase()}: `}</span>
      <span aria-hidden="true" className="font-mono text-[#95ccff]">
        {`《${kind}》`}
      </span>{" "}
    </>
  );
}

/** '《Notice》 text', for toasts, bubbles and other plain strings. */
export function sageText(kind: SageKind, text: string): string {
  return `《${kind}》 ${text}`;
}
