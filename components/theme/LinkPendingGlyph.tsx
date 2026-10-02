"use client";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * A link's arrow that turns into a spinner while its navigation is pending
 * (a page without loading.tsx keeps the old page up until the new one
 * arrives). A fixed 16px box, so nothing shifts; the spinner waits 100 ms,
 * so fast navigations never flash it. Must be rendered inside a next/link
 * <Link>. Decorative (aria-hidden): Next's route announcer reads the new page.
 */
export default function LinkPendingGlyph({ glyph }: { glyph: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden="true" className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <span className={`transition-opacity duration-150 ${pending ? "opacity-0 delay-100" : "opacity-100"}`}>
        {glyph}
      </span>
      <span
        className={`absolute inset-0 rounded-full border-2 border-[#95ccff]/30 border-t-[#95ccff] transition-opacity duration-150 ${
          pending ? "animate-spin opacity-100 delay-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
