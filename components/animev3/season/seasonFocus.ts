/**
 * Keyboard focus across season navigation. Next focuses the new page's first
 * element after a client navigation (a no-op on the season page's
 * non-focusable root), so focus would fall back to <body>. The season link
 * that was used leaves a one-shot token here (onNavigate, so never on
 * Back/Forward), and the new page's SeasonNav takes it on mount and focuses
 * the same tile ("Next" again), or the h1.
 */
export type SeasonFocusSlot = "prev" | "next" | "title";

/** Old tokens (an abandoned navigation) never steal focus later. */
const TOKEN_TTL_MS = 10_000;

let token: { slot: SeasonFocusSlot; href: string | null; at: number } | null = null;

/** `href` null: the target URL isn't known (/anime redirects to the current season). */
export function rememberSeasonFocus(slot: SeasonFocusSlot, href: string | null) {
  token = { slot, href, at: Date.now() };
}

/** The slot to focus on the page at `path`, once; null when there's no fresh token for it. */
export function takeSeasonFocus(path: string): SeasonFocusSlot | null {
  const current = token;
  token = null;
  if (!current || Date.now() - current.at > TOKEN_TTL_MS) return null;
  if (current.href !== null && current.href !== path) return null;
  return current.slot;
}
