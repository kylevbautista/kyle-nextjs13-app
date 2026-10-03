import { NextResponse, type NextRequest } from "next/server";
import { parseTopAnimePage } from "@/lib/topAnime";
import { fetchTopAnimePage, MyAnimeListError } from "@/server/lib/myanimelist";

/** Like /topanime itself: the ranking moves slowly. */
const CDN_SECONDS = 3600;
/** How long the CDN may serve an expired page while it fetches a fresh one. */
const CDN_STALE_SECONDS = 300;

/**
 * GET ?page=N → { page: TopAnimePage }: one page of MyAnimeList's ranking for
 * /topanime's "Show more". The browser can't call MAL itself (no CORS, and
 * the Client ID stays on the server).
 *
 * One cache layer, the CDN (s-maxage 1 h): a page is at most about an hour
 * old. (Next's data cache isn't used here: it can serve a stale page of any
 * age while it refreshes.) One MAL attempt per request, so a burst of misses
 * isn't multiplied by retries, and server/lib/myanimelist.ts pauses this
 * instance after a failure. Errors: 400 bad page, 429 when MAL rate limits
 * (with the wait in Retry-After), 502 for anything else upstream.
 */
export async function GET(request: NextRequest) {
  const page = parseTopAnimePage(request.nextUrl.searchParams.get("page"));
  if (page === null) {
    return NextResponse.json({ error: "page must be a whole number from 1" }, { status: 400 });
  }
  try {
    const { page: result } = await fetchTopAnimePage(page, { attempts: 1 });
    return NextResponse.json(
      { page: result },
      { headers: { "Cache-Control": `public, s-maxage=${CDN_SECONDS}, stale-while-revalidate=${CDN_STALE_SECONDS}` } }
    );
  } catch (err) {
    console.error("Top anime page failed:", err);
    const rateLimited = err instanceof MyAnimeListError && err.status === 429;
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (rateLimited && err.retryAfterSeconds !== undefined) headers["Retry-After"] = String(err.retryAfterSeconds);
    return NextResponse.json(
      { error: rateLimited ? "rate_limited" : "upstream_error" },
      { status: rateLimited ? 429 : 502, headers }
    );
  }
}
