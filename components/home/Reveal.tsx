"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { trackLanding, type LandingEvents, type LandingLocation } from "./analytics";
import { SLIME_COLORS } from "./slimeArt";

/*
 * The landing's small client-side motion runtime: the reveal observer (the
 * default export), the leaves the directive-free <Slime> renders inside its
 * <svg> (offscreen pausing, the gulp replay), and offscreen pausing for HTML
 * decor (the #quests night sky).
 */

/**
 * One IntersectionObserver for every `[data-reveal]` element on the landing.
 *
 * On mount it marks only the elements whose top is below the viewport as
 * `data-reveal="pending"` (hidden by globals.css), then flips each to "done"
 * as it enters view. It only touches DOM attributes; there is no React state.
 * No-JS visitors and anything visible at load are never hidden. Landing motion
 * deliberately runs regardless of the operating system's motion preference.
 *
 * It also hosts one delegated click listener for server-rendered links that
 * carry `data-cta` / `data-cta-location` (server components can't attach
 * handlers), which fires `cta_click`.
 */
export default function Reveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const viewportBottom = window.innerHeight;
    const pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => {
        const state = el.getAttribute("data-reveal");
        return state !== "pending" && state !== "done" && el.getBoundingClientRect().top > viewportBottom;
      }
    );
    if (!pending.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "done");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
    for (const el of pending) {
      el.setAttribute("data-reveal", "pending");
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      // Never leave anything hidden behind (unmount, Strict Mode re-run).
      for (const el of pending) {
        if (el.getAttribute("data-reveal") === "pending") el.setAttribute("data-reveal", "");
      }
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("[data-cta]");
      if (!link) return;
      const cta = link.getAttribute("data-cta");
      const location = link.getAttribute("data-cta-location");
      if (!isCta(cta) || !isLocation(location)) return;
      trackLanding("cta_click", { cta, location } as LandingEvents["cta_click"]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

const CTAS = [
  "open_my_list",
  "add_first_shows",
  "browse_season",
  "airing_schedule",
  "top_anime",
  "search",
  "copy_list_link",
] as const;
const LOCATIONS: readonly LandingLocation[] = [
  "hero",
  "hero_next_up",
  "airing_next",
  "tracker",
  "schedule",
  "sage_search",
  "tempest",
  "faq",
  "quests",
  "sticky",
  "dialog",
];
const isCta = (value: string | null): value is (typeof CTAS)[number] =>
  !!value && (CTAS as readonly string[]).includes(value);
const isLocation = (value: string | null): value is LandingLocation =>
  !!value && (LOCATIONS as readonly string[]).includes(value);

/* ------------------------------------------------------------------------- */

let offscreenObserver: IntersectionObserver | null = null;

function getOffscreenObserver() {
  if (!offscreenObserver && typeof IntersectionObserver !== "undefined") {
    offscreenObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
      }
    });
  }
  return offscreenObserver;
}

/**
 * Rendered inside an animated slime's <svg>: pauses its idle animations while
 * the slime is out of view (`data-offscreen` → animation-play-state: paused).
 * One shared observer serves every slime on the page.
 */
export function PauseWhenOffscreen() {
  return (
    <g
      ref={(node) => {
        const svg = node?.ownerSVGElement;
        const observer = getOffscreenObserver();
        if (!svg || !observer) return;
        observer.observe(svg);
        return () => {
          observer.unobserve(svg);
          svg.removeAttribute("data-offscreen");
        };
      }}
    />
  );
}

/**
 * The same for HTML decor (the #quests night sky): pauses every animation in
 * its parent element while that is out of view. Renders a hidden <span>.
 */
export function PauseParentWhenOffscreen() {
  return (
    <span
      hidden
      ref={(node) => {
        const parent = node?.parentElement;
        const observer = getOffscreenObserver();
        if (!parent || !observer) return;
        observer.observe(parent);
        return () => {
          observer.unobserve(parent);
          parent.removeAttribute("data-offscreen");
        };
      }}
    />
  );
}

/* ------------------------------------------------------------------------- */

type GulpKey = string | number | undefined;

/** A numeric key (a list count) gulps only when it grows; any other change gulps. */
const isGulp = (from: GulpKey, to: GulpKey) =>
  from !== undefined &&
  to !== undefined &&
  (typeof from === "number" && typeof to === "number" ? to > from : from !== to);

/**
 * The slime's body group, which replays the 500 ms gulp (squash, happy eyes
 * and a "+1" floating up) each time `gulpKey` changes after mount, by
 * re-keying itself: no effect, the previous key is state derived during
 * render. The first key (e.g. the list count arriving) never gulps, and a
 * count going down (a removal) doesn't either.
 */
export function SlimeGulp({
  gulpKey,
  style,
  children,
}: {
  gulpKey: GulpKey;
  style: CSSProperties;
  children: ReactNode;
}) {
  const [seen, setSeen] = useState({ key: gulpKey, gulps: 0 });
  if (seen.key !== gulpKey) {
    setSeen({ key: gulpKey, gulps: seen.gulps + (isGulp(seen.key, gulpKey) ? 1 : 0) });
  }
  const gulping = seen.gulps > 0;

  return (
    <g
      key={seen.gulps}
      className={gulping ? "slime-gulping animate-slime-gulp" : undefined}
      style={style}
    >
      {children}
      {gulping && (
        <text
          x="146"
          y="46"
          opacity={0}
          fill={SLIME_COLORS.rim}
          stroke="#0f2442"
          strokeWidth={0.75}
          paintOrder="stroke"
          fontSize="26"
          fontWeight={800}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          className="animate-slime-sparkle"
        >
          +1
        </text>
      )}
    </g>
  );
}
