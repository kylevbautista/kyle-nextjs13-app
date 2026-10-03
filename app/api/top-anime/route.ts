import { NextResponse, type NextRequest } from "next/server";
import { parseTopAnimePage } from "@/lib/topAnime";
import { fetchTopAnimePage, MyAnimeListError } from "@/server/lib/myanimelist";

/** Like /topanime itself: the ranking moves slowly. */
const CACHE_SECONDS = 3600;

/**
 * GET ?page=N → { page: TopAnimePage }: one page of MyAnimeList's ranking for
 * /topanime's "Show more". The browser can't call MAL itself (no CORS, and
 * the Client ID stays on the server). Each page is cached for an hour in
 * Next's data cache and at the CDN, so a page costs MAL about one request an
 * hour however many people load it. Errors: 400 bad page, 429 when MAL rate
 * limits (its Retry-After passed on), 502 for anything else upstream.
 */
export async function GET(request: NextRequest) {
  const page = parseTopAnimePage(request.nextUrl.searchParams.get("page"));
  if (page === null) {
    return NextResponse.json({ error: "page must be a whole number from 1" }, { status: 400 });
  }
  try {
    const result = await fetchTopAnimePage(page, { attempts: 2, cacheSeconds: CACHE_SECONDS });
    return NextResponse.json(
      { page: result },
      { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}` } }
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
