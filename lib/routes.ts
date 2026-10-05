/** URL builders shared by server and client code. */

/** The full tracker: statuses, progress, score, dates. */
export const myListPath = (userId: string) => `/user/${userId}`;

/** Upcoming episodes from a user's list (not dropped or completed), by weekday (PT), with countdowns. */
export const airingSchedulePath = (userId: string) => `/mylist/${userId}`;

export const searchPath = (query?: string) =>
  query ? `/search?q=${encodeURIComponent(query)}` : "/search";

export const signInPath = (callbackUrl?: string) =>
  callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin";

/** How a link's href marks it as the current page: the same path, the path and anything below it, or never. */
export type PathMatch = "exact" | "prefix" | "none";

/**
 * Whether `pathname` is the page `href` points to (the nav's aria-current, the account menu's
 * current item). "prefix" matches `href` and its sub-paths, never a longer sibling (/anime is not
 * current on /animex or /topanime). "none" is the カイル brand: never current.
 */
export function isCurrentPath(pathname: string, href: string, match: PathMatch = "prefix"): boolean {
  if (match === "none") return false;
  if (pathname === href) return true;
  return match === "prefix" && pathname.startsWith(`${href}/`);
}

/** My List's link-preview image (CLAUDE.md §5.8). `v` = components/og/shareCard.ts#shareVersion, a cache key. */
export const listShareImagePath = (userId: string, v: string) => `/user/og/${userId}/${v}`;
/** The Airing Schedule's link-preview image. */
export const scheduleShareImagePath = (userId: string, v: string) => `/mylist/og/${userId}/${v}`;
