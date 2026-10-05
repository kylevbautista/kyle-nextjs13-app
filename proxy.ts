import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SEASON_SORT_COOKIE,
  SEASON_SORT_COOKIE_MAX_AGE,
  SEASON_SORT_COOKIE_PATH,
  renewsSortCookie,
  seasonProxyAction,
  storedSort,
} from "@/lib/seasonSort";

/**
 * Season routing at request time, before anything renders:
 * /anime and /anime/<year> → current season; bad years/seasons → current
 * season; "Fall"/extra segments → canonical URL.
 *
 * It runs here rather than in the page because redirects must happen before
 * streaming (CLAUDE.md §9.6), and not in next.config.js redirects(), which
 * are frozen at build time.
 *
 * A reader who picked a sort other than the default (the kv-season-sort
 * cookie, lib/seasonSort.ts) gets the page's static variant in that order:
 * a rewrite (the URL stays canonical), for documents and client navigations
 * alike. The cookie is re-issued from here on every full load of a season
 * page, so it slides (Safari caps cookies a page script writes at 7 days).
 */
export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean).slice(1);
  let decoded: string[];
  try {
    decoded = segments.map(decodeURIComponent);
  } catch {
    decoded = [];
  }
  const stored = storedSort(request.cookies.get(SEASON_SORT_COOKIE)?.value);
  const action = seasonProxyAction(decoded, stored);
  if (action && "redirect" in action) return NextResponse.redirect(new URL(action.redirect, request.url), 307);

  let response: NextResponse;
  if (action) {
    const url = request.nextUrl.clone();
    url.pathname = action.rewrite;
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next();
  }
  if (stored && renewsSortCookie(request.headers)) {
    response.cookies.set(SEASON_SORT_COOKIE, stored, {
      path: SEASON_SORT_COOKIE_PATH,
      maxAge: SEASON_SORT_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = {
  matcher: ["/anime", "/anime/:path*"],
};
