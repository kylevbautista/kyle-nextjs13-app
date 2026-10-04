import type { ReactNode } from "react";
import ConsoleFrame from "./ConsoleFrame";
import { CARD_PAGE, CARD_PAGE_FRAME, CARD_PAGE_GLOW, CARD_PAGE_SKY, CARD_PAGE_SLOT, CARD_STACK } from "./tokens";

/**
 * The card pages' frame (the 404, the error page, sign-in, account): the owner's centered card,
 * themed. A full-row <main> on the night sky, one glow, the Great Sage console (ConsoleFrame) as the
 * card, and the owner's <section aria-labelledby> inside it. Hook-free with classes from tokens.ts,
 * so server pages and app/error.tsx both render it (§9.21).
 *
 * `sky` is a slot, never an import: app/error.tsx ships on every page, so it passes a lazy sky
 * (ErrorDecor) while server pages pass <NightSky variant="page" forest={false} /> (the footer's
 * treeline is the only forest). The <main> paints the sky's gradient itself either way.
 * Not focusable: Next focuses a segment's first element after a navigation (§9.15).
 */
export default function CardPage({
  titleId,
  size = "md",
  sky,
  children,
}: {
  /** The card's h1 id (the section's aria-labelledby). */
  titleId: string;
  /** The owner's widths and gaps: "md" = max-w-md + gap-5 (404, error); "sm" = max-w-sm + gap-6 (sign-in, account). */
  size?: "sm" | "md";
  sky?: ReactNode;
  children: ReactNode;
}) {
  const small = size === "sm";
  return (
    // data-card-page: the footer's horizon matches this sky (FOOTER_HORIZON).
    <main data-card-page="" className={CARD_PAGE}>
      {sky && (
        <div aria-hidden="true" className={CARD_PAGE_SKY}>
          {sky}
        </div>
      )}
      <div className={`${CARD_PAGE_SLOT} ${small ? "max-w-sm" : "max-w-md"}`}>
        <span aria-hidden="true" className={CARD_PAGE_GLOW} />
        <ConsoleFrame className={CARD_PAGE_FRAME}>
          <section aria-labelledby={titleId} className={`${CARD_STACK} ${small ? "gap-6" : "gap-5"}`}>
            {children}
          </section>
        </ConsoleFrame>
      </div>
    </main>
  );
}
