import type { ListStatus } from "./types";

/**
 * Tailwind classes for a list-status badge (My List cards, the landing's
 * tracker demo). Pair with `ring-1 ring-inset`.
 */
export const STATUS_BADGE_CLASS: Record<ListStatus, string> = {
  watching: "bg-blue-500/20 text-blue-200 ring-blue-400/40",
  planning: "bg-violet-500/20 text-violet-200 ring-violet-400/40",
  completed: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
  paused: "bg-amber-500/20 text-amber-200 ring-amber-400/40",
  dropped: "bg-rose-500/20 text-rose-200 ring-rose-400/40",
};
