import type { ReactNode } from "react";
import NightSky from "@/components/home/NightSky";
import { SageLine, type SageKind } from "@/components/home/SageLine";
import { APP_CONTAINER, EYEBROW_CLASS, PAGE_TITLE_CLASS } from "./tokens";

/**
 * The top of every redesigned app page: the landing hero's night sky, cut
 * down to a banner. Eyebrow ("Skill 02 · Predator"), an optional `lead`
 * (/search's box on top), a Great Sage line that types in on load (or a
 * `sageSlot` that streams one), the moonlit h1, a subhead, then `children`
 * (actions, stats) under the text and `aside` (an Evolution card, a
 * Next-episodes card) on the right from 1024px. Below 1024px the aside stacks
 * under the text; pass `asideClassName="hidden lg:block"` for a desktop-only
 * aside.
 *
 * Hook-free, so server and client components can both render it. The h1
 * takes `titleId` and is focusable (tabIndex -1) so a page can move focus to
 * it when the element that had focus disappears.
 */
export default function PageBanner({
  eyebrow,
  lead,
  sage,
  sageSlot,
  title,
  titleId,
  sub,
  children,
  aside,
  asideClassName = "",
  sageKey,
}: {
  eyebrow: string;
  /** Under the eyebrow, before the Great Sage line (/search keeps its search box on top). */
  lead?: ReactNode;
  sage?: { kind: SageKind; text: ReactNode };
  /**
   * Your own Great Sage line in place of `sage`: /search streams its report
   * (a Suspense boundary around a SageLine with scan="load" className="mt-4").
   */
  sageSlot?: ReactNode;
  title: ReactNode;
  titleId?: string;
  sub?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  /** Extra classes for the aside's wrapper, e.g. "hidden lg:block". */
  asideClassName?: string;
  /** Changing it re-types the Sage line (a page whose line follows live events). */
  sageKey?: string;
}) {
  return (
    // -mt-2 cancels the nav's bottom margin so the sky meets the nav bar.
    <header className="relative isolate -mt-2 overflow-hidden [contain:inline-size]">
      <NightSky variant="page" />
      <div
        className={`${APP_CONTAINER} grid gap-8 pb-16 pt-8 sm:pb-20 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12`}
      >
        <div className="min-w-0">
          <p className={EYEBROW_CLASS}>{eyebrow}</p>
          {lead && <div className="mt-5 min-w-0">{lead}</div>}
          {sageSlot ??
            (sage && (
              <SageLine key={sageKey} kind={sage.kind} scan="load" className="mt-4">
                {sage.text}
              </SageLine>
            ))}
          <h1
            id={titleId}
            tabIndex={-1}
            className={`mt-5 scroll-mt-20 break-words focus:outline-none ${PAGE_TITLE_CLASS}`}
          >
            {title}
          </h1>
          {sub && <p className="mt-3 max-w-2xl text-base leading-7 text-[#c9d6e6] sm:text-lg">{sub}</p>}
          {children}
        </div>
        {aside && <div className={`min-w-0 lg:w-[22rem] ${asideClassName}`}>{aside}</div>}
      </div>
    </header>
  );
}
