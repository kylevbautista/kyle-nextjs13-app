import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { getListIds } from "@/server/lib/userList";

/** GET → { ids: number[] } — AniList ids on the caller's list (401 when signed out). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.objectId) {
    return NextResponse.json({ ids: [] }, { status: 401 });
  }
  try {
    const ids = await getListIds(session.objectId);
    return NextResponse.json({ ids }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("Error reading anime list ids:", err);
    return NextResponse.json({ error: "Failed to read anime list" }, { status: 500 });
  }
}
