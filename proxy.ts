import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { seasonRouteRedirect } from "@/lib/season";

/**
 * Season routing at request time, before anything renders:
 * /anime and /anime/<year> → current season; bad years/seasons → current
 * season; "Fall"/extra segments → canonical URL.
 *
 * It runs here rather than in the page because redirects must happen before
 * streaming (CLAUDE.md §9.6), and not in next.config.js redirects(), which
 * are frozen at build time.
 */
export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean).slice(1);
  let decoded: string[];
  try {
    decoded = segments.map(decodeURIComponent);
  } catch {
    decoded = [];
  }
  const target = seasonRouteRedirect(decoded);
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url), 307);
}

export const config = {
  matcher: ["/anime", "/anime/:path*"],
};
