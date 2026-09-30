"use client";
import { useEffect, useRef, useState } from "react";
import { nextAiring } from "@/lib/anime/airing";
import { displayTitle } from "@/lib/anime/types";
import { formatCountdownMinutes } from "@/lib/landing";
import { trackOnce } from "./analytics";
import { useVisibleAiring } from "./LandingProvider";
import { SAGE_FRAME, type SageKind } from "./SageLine";
import Slime from "./Slime";
import { useLandingSession } from "./useLandingSession";

const QUIP_MS = 3500;
const NEXT_UP_QUIP = 3;
const QUIP_COUNT = 6;

interface Quip {
  kind: SageKind;
  text: string;
}

interface PokeState {
  /** Pokes so far this page view. */
  count: number;
  /** Index of the last quip shown (-1 before the first poke). */
  index: number;
  quip: Quip | null;
  bubble: boolean;
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * The hero's slime: the only interactive one. It wakes once, idles, follows
 * fine pointers with its eyes, squishes on hover, and on click / Enter /
 * Space plays a poke and shows the next Great Sage quip (in order, never at
 * random), mirrored to a screen-reader status. It wears the viewer's
 * evolution tier and gulps when the list grows.
 */
export default function HeroSlime({ nextUpIds }: { nextUpIds: number[] }) {
  const session = useLandingSession();
  const nextUp = useVisibleAiring(nextUpIds, 1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [poke, setPoke] = useState<PokeState>({ count: 0, index: -1, quip: null, bubble: false });

  const signedIn = session.status === "signedIn";
  const tier = signedIn ? session.tier : "slime";
  const count = signedIn ? session.count : null;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Offscreen pausing for every hero animation, plus the pointer "look".
  useEffect(() => {
    const button = buttonRef.current;
    const hero = button?.closest<HTMLElement>("[data-hero]");
    const svg = button?.querySelector("svg");
    if (!button || !hero || !svg) return;

    const trackPointer =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let listening = false;

    const apply = () => {
      frame = 0;
      const slime = svg.getBoundingClientRect();
      const lookX = clamp((pointerX - (slime.left + slime.width / 2)) / (window.innerWidth / 2));
      const lookY = clamp((pointerY - (slime.top + slime.height / 2)) / (window.innerHeight / 2));
      svg.style.setProperty("--look-x", lookX.toFixed(3));
      svg.style.setProperty("--look-y", lookY.toFixed(3));
      const area = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${Math.round(pointerX - area.left)}px`);
      hero.style.setProperty("--my", `${Math.round(pointerY - area.top)}px`);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) window.addEventListener("pointermove", onPointerMove, { passive: true });
      else window.removeEventListener("pointermove", onPointerMove);
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        const visible = entry?.isIntersecting ?? true;
        hero.toggleAttribute("data-offscreen", !visible);
        if (trackPointer) listen(visible);
      });
      observer.observe(hero);
    } else if (trackPointer) {
      listen(true);
    }

    return () => {
      observer?.disconnect();
      listen(false);
      if (frame) cancelAnimationFrame(frame);
      hero.removeAttribute("data-offscreen");
      svg.style.removeProperty("--look-x");
      svg.style.removeProperty("--look-y");
    };
  }, []);

  const handlePoke = () => {
    const pokes = poke.count + 1;

    // Quip 4 needs a live countdown; skip it when there is none.
    const next = nextUp[0];
    const airing = next ? nextAiring(next) : null;
    const left = airing ? airing.airingAt - Math.floor(Date.now() / 1000) : 0;
    const nextUpText =
      next && airing && left > 0
        ? `Next up: ${displayTitle(next)}${airing.episode ? ` EP ${airing.episode}` : ""} in ${formatCountdownMinutes(left)}.`
        : null;

    let index = (poke.index + 1) % QUIP_COUNT;
    if (index === NEXT_UP_QUIP && !nextUpText) index += 1;

    const quips: Quip[] = [
      { kind: "Answer", text: "Poking the slime does not count as watching an episode." },
      { kind: "Notice", text: "Squishiness: 100%. Structural integrity: also 100%." },
      { kind: "Report", text: "The slime is not a button. It is, technically, a button." },
      { kind: "Notice", text: nextUpText ?? "" },
      { kind: "Answer", text: "Affirmative. Very squishy." },
      {
        kind: "Notice",
        text: `Poke count: ${pokes}. Recommend: ${signedIn ? "open My List" : "start your list"}.`,
      },
    ];

    setPoke({ count: pokes, index, quip: quips[index], bubble: true });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPoke((current) => ({ ...current, bubble: false })), QUIP_MS);
    trackOnce("slime_poke");
  };

  const pokeClass =
    poke.count === 0
      ? ""
      : poke.count % 2
        ? "animate-slime-poke"
        : "animate-slime-poke-2";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Poke the slime"
        onClick={handlePoke}
        className="group relative block aspect-[200/170] w-20 rounded-[40%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428] sm:w-[150px] laptop:w-[200px]"
      >
        <span className="slime-wake block h-full w-full origin-bottom transition-transform duration-[180ms] ease-[cubic-bezier(.34,1.56,.64,1)] [@media(hover:hover)]:group-hover:[transform:scale(1.08,.9)]">
          <span className={`block h-full w-full origin-bottom ${pokeClass}`}>
            {/* Gulps when the list grows (never when the count first loads). */}
            <Slime size={200} tier={tier} gulpKey={count ?? undefined} className="h-full w-full" />
          </span>
        </span>
      </button>

      {poke.bubble && poke.quip && (
        <p
          aria-hidden="true"
          className={`absolute right-0 top-full z-20 mt-2 w-max max-w-[min(17rem,calc(100vw-2rem))] px-3 py-2 text-left text-xs leading-5 animate-rise-in sm:left-full sm:right-auto sm:top-2 sm:ml-4 sm:mt-0 laptop:left-auto laptop:right-full laptop:top-0 laptop:ml-0 laptop:mr-3 ${SAGE_FRAME} bg-[#0a1528]/95`}
        >
          <span className="text-[#95ccff]">《{poke.quip.kind}》</span> {poke.quip.text}
        </p>
      )}
      <p role="status" className="sr-only">
        {poke.quip ? `Great Sage ${poke.quip.kind.toLowerCase()}: ${poke.quip.text}` : ""}
      </p>
    </div>
  );
}
