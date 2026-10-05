import { listShareImage } from "@/components/og/ListShareImage";
import { notFoundResponse, shareImageResponse } from "@/components/og/respond";
import { SHARE_VERSION_RE, listShareCard } from "@/components/og/shareCard";
import { CANONICAL_ID_RE, readListCard } from "@/server/lib/userList";

/**
 * My List's link-preview image (CLAUDE.md §5.8): a 1200×630 PNG of the visitor
 * banner, drawn from stored list data only (no session, no AniList refresh).
 * `v` (shareVersion) is a cache key the page's og:image URL carries; the image
 * always draws the current stored data. Runtime ISR: nothing renders at build
 * (no Mongo needed); each URL renders once, then at most once an hour.
 * force-static stubs the request APIs, so the image can't vary per viewer.
 */
export const dynamic = "force-static";
export const revalidate = 3600;
export function generateStaticParams(): { id: string; v: string }[] {
  return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; v: string }> }) {
  const { id, v } = await params;
  if (!CANONICAL_ID_RE.test(id) || !SHARE_VERSION_RE.test(v)) return notFoundResponse();
  const owner = await readListCard(id);
  if (!owner) return notFoundResponse();
  return shareImageResponse(
    () => listShareImage(listShareCard(owner.entries, owner.name)),
    () => listShareImage(listShareCard(owner.entries, owner.name, { neutral: true }))
  );
}
