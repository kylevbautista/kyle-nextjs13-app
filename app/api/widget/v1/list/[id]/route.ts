import { NextResponse, after } from "next/server";
import { WIDGET_FALLBACK_COPY } from "@/lib/anime/widgetCopy";
import { WIDGET_SCHEMA, WIDGET_SCRIPT_SOURCE, WIDGET_V1_RETIRED, buildWidgetPayload } from "@/lib/widget";
import { CANONICAL_ID_RE, readWidgetOwner, refreshEntriesIfStale } from "@/server/lib/userList";

export const dynamic = "force-dynamic";

// A CDN copy would hide the refresh trigger and serve a stale generatedAt; the phone coalesces its own reloads.
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } as const;

const fail = (status: number, error: string, extra: Record<string, string> = {}) =>
  NextResponse.json({ schema: WIDGET_SCHEMA, error, ...extra }, { status, headers: HEADERS });

/**
 * The iPhone widget's data (widgets/scriptable/kylevb-anime.js, CLAUDE.md §5.9): the owner's first name and
 * tier and the next episodes of one list, public by link like /mylist/<id>. Answers from one projected read;
 * the stale-airing refresh (§5.5, the same 10-minute lock) runs after the response, so a widget run never
 * waits on AniList.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (WIDGET_V1_RETIRED) {
    return fail(410, "outdated", { message: WIDGET_FALLBACK_COPY.outdated.text ?? "", url: WIDGET_SCRIPT_SOURCE });
  }
  const { id } = await params;
  if (!CANONICAL_ID_RE.test(id)) return fail(404, "not-found");
  try {
    const owner = await readWidgetOwner(id);
    if (!owner) return fail(404, "not-found");
    const payload = buildWidgetPayload({ userId: id, name: owner.name, entries: owner.entries, nowMs: Date.now() });
    after(() => refreshEntriesIfStale(owner.user, owner.entries));
    return NextResponse.json(payload, { headers: HEADERS });
  } catch (err) {
    console.error("Widget data failed:", (err as Error)?.message ?? err);
    return fail(503, "unavailable");
  }
}
