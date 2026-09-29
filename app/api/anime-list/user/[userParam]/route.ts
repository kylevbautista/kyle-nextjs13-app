import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { findUserById, loadListEntries, resolveListOwner } from "@/server/lib/userList";

/**
 * GET → { list: ListEntry[] } for /user/<id> and /mylist/<id> (public read).
 * `userParam` is the owner's ObjectId hex; legacy base64url(email) params only
 * work for the signed-in owner. Stale airing data is refreshed from AniList.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ userParam: string }> }
) {
  const { userParam } = await props.params;
  const session = await getServerSession(authOptions);

  try {
    const lookup = await resolveListOwner(userParam, session);
    const user =
      lookup.kind === "found"
        ? lookup.user
        : lookup.kind === "redirect"
          ? await findUserById(lookup.userId)
          : null;
    if (!user) {
      return NextResponse.json({ error: "List not found", list: [] }, { status: 404 });
    }

    const list = await loadListEntries(user);
    return NextResponse.json(
      { list },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("Error fetching user anime list:", err);
    return NextResponse.json({ error: "Failed to fetch anime list", list: [] }, { status: 500 });
  }
}
