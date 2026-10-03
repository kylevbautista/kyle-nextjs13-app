/** URL builders shared by server and client code. */

/** The full tracker: statuses, progress, score, dates. */
export const myListPath = (userId: string) => `/user/${userId}`;

/** This season's shows from a user's list, by weekday, with countdowns. */
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
