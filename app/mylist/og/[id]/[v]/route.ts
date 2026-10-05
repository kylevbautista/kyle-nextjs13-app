import { scheduleShareImage } from "@/components/og/ScheduleShareImage";
import { notFoundResponse, shareImageResponse } from "@/components/og/respond";
import { SHARE_VERSION_RE, scheduleShareCard } from "@/components/og/shareCard";
import { CANONICAL_ID_RE, readListCard } from "@/server/lib/userList";

/**
 * The Airing Schedule's link-preview image (CLAUDE.md §5.8): a 1200×630 PNG of
 * the visitor banner and week strip, drawn from stored list data only (no
 * session, no AniList refresh, no clock). `v` (shareVersion) is a cache key the
 * page's og:image URL carries; the image always draws the current stored data.
 * Runtime ISR, like /user/og (see that route).
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
    () => scheduleShareImage(scheduleShareCard(owner.entries, owner.name)),
    () => scheduleShareImage(scheduleShareCard(owner.entries, owner.name, { neutral: true }))
  );
}
