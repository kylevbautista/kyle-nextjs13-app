import type { ReactNode } from "react";
import { SAGE_CONSOLE, SCANLINES } from "./tokens";

/**
 * The Great Sage console frame: glow border, scanlines, four corner brackets.
 * The landing's search chapter and the /search home (CLAUDE.md §9.18: change
 * both together). Hook-free, with class strings from tokens.ts, so server
 * components can render it (§9.21). Padding and margins come from `className`.
 */
export default function ConsoleFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${SAGE_CONSOLE} ${className}`}>
      <div aria-hidden="true" className={SCANLINES} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-[#95ccff]/60" />
        <span className="absolute right-3 top-3 h-3 w-3 border-r-2 border-t-2 border-[#95ccff]/60" />
        <span className="absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-[#95ccff]/60" />
        <span className="absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-[#95ccff]/60" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
