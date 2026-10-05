"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { UndoView } from "@/lib/anime/trackQueue";
import { UNDO_BUTTON, UNDO_DRAIN } from "./tokens";

/** How long Undo stays once its line is said. Keep equal to the `undo-drain` animation in tailwind.config.js. */
export const UNDO_MS = 10_000;

/**
 * A tracker card's "↶ Undo +N" (My List's ListCard and the landing's
 * TrackerDemo), in place of the card's date · score line. It counts down 10 s
 * once the burst's line is said, with a 2px line draining along its bottom.
 * The time stops (WCAG 2.2.1) while a mouse or pen is over the card, while
 * focus is anywhere in the card (a keyboard or screen-reader user who just
 * pressed +1 is still there, even in browse mode), and while the tab is
 * hidden, and starts again from full afterwards. Edit stays an untimed way
 * back to any value.
 *
 * The card element carries `data-track-card`. No card re-renders while the
 * timer counts: the drain is a CSS animation and the timer lives here.
 */
export default function UndoButton({
  id,
  undo,
  label,
  title,
  onUndo,
  onExpire,
}: {
  id?: string;
  undo: UndoView;
  /** The accessible name (trackerConsole#undoLabel); starts with the visible "Undo +N". */
  label: string;
  title: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [paused, setPaused] = useState(false);
  /** Bumped on resume: remounts the drain and restarts the timer from full. */
  const [restart, setRestart] = useState(0);
  const pausedRef = useRef(false);
  const flags = useRef({ hover: false, within: false, hidden: false });
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const button = ref.current;
    if (!button) return;
    const card = button.closest("[data-track-card]");
    const state = flags.current;
    const apply = () => {
      const next = state.hover || state.within || state.hidden;
      if (next === pausedRef.current) return;
      pausedRef.current = next;
      setPaused(next);
      if (!next) setRestart((value) => value + 1);
    };
    const enter = (event: Event) => {
      if ((event as PointerEvent).pointerType === "touch") return;
      state.hover = true;
      apply();
    };
    const leave = (event: Event) => {
      if ((event as PointerEvent).pointerType === "touch") return;
      state.hover = false;
      apply();
    };
    const focusWithin = () => {
      state.within = Boolean(card ? card.contains(document.activeElement) : document.activeElement === button);
      apply();
    };
    // focusout fires before the next element gets focus: check once it has.
    const focusOut = () => requestAnimationFrame(focusWithin);
    const visibility = () => {
      state.hidden = document.hidden;
      apply();
    };
    // The starting state (a mouse already over the card, focus already here), outside the effect's body.
    const frame = requestAnimationFrame(() => {
      state.hover = window.matchMedia("(hover: hover)").matches && Boolean(card?.matches(":hover"));
      state.within = Boolean(card ? card.contains(document.activeElement) : document.activeElement === button);
      state.hidden = document.hidden;
      apply();
    });
    const focusTarget: Element = card ?? button;
    card?.addEventListener("pointerenter", enter);
    card?.addEventListener("pointerleave", leave);
    focusTarget.addEventListener("focusin", focusWithin);
    focusTarget.addEventListener("focusout", focusOut);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      card?.removeEventListener("pointerenter", enter);
      card?.removeEventListener("pointerleave", leave);
      focusTarget.removeEventListener("focusin", focusWithin);
      focusTarget.removeEventListener("focusout", focusOut);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!undo.counting || undo.undoing || paused) return;
    const timer = setTimeout(() => {
      const state = flags.current;
      const card = ref.current?.closest("[data-track-card]");
      const within = card ? card.contains(document.activeElement) : document.activeElement === ref.current;
      if (state.hover || within || document.hidden) {
        pausedRef.current = true;
        setPaused(true);
      } else {
        expire();
      }
    }, UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo.counting, undo.undoing, restart, paused]);

  return (
    <button
      ref={ref}
      id={id}
      type="button"
      data-undo=""
      onClick={() => {
        if (!undo.undoing) onUndo();
      }}
      aria-disabled={undo.undoing || undefined}
      aria-label={undo.undoing ? undefined : label}
      title={title}
      className={UNDO_BUTTON}
    >
      <span aria-hidden="true">↶</span>
      {undo.undoing ? "Undoing…" : `Undo +${undo.n}`}
      {!undo.undoing && (
        <span
          aria-hidden="true"
          key={`${undo.counting}:${restart}`}
          data-paused={paused || !undo.counting || undefined}
          className={UNDO_DRAIN}
        />
      )}
    </button>
  );
}
