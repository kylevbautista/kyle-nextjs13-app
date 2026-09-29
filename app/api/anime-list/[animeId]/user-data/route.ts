import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { toObjectId, usersCollection } from "@/server/lib/userList";
import { normalizeEntry, normalizeUserData } from "@/lib/anime/normalize";

/**
 * PATCH { userData: Partial<UserAnimeData> } → update one entry on the caller's list.
 * Validation and tracker rules (auto-complete, start/finish dates) live in
 * lib/anime/normalize.ts#normalizeUserData. Responds with the saved userData.
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ animeId: string }> }
) {
  const { animeId: animeIdParam } = await props.params;
  const session = await getServerSession(authOptions);
  const userId = toObjectId(session?.objectId);
  if (!userId) {
    return NextResponse.json({ error: "User is not authenticated" }, { status: 401 });
  }

  const animeId = Number(animeIdParam);
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // handled below
  }
  if (!Number.isInteger(animeId) || animeId <= 0 || !body?.userData) {
    return NextResponse.json(
      { error: "User data and anime ID are required" },
      { status: 400 }
    );
  }

  try {
    const users = await usersCollection();
    const doc = await users.findOne(
      { _id: userId, "following.id": animeId },
      { projection: { "following.$": 1 } }
    );
    const current = normalizeEntry(doc?.following?.[0]);
    if (!current) {
      return NextResponse.json({ error: "Anime is not in your list" }, { status: 404 });
    }

    const result = normalizeUserData(body.userData, {
      episodes: current.episodes,
      previous: current.userData,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await users.updateOne(
      { _id: userId, "following.id": animeId },
      { $set: { "following.$.userData": result.value } }
    );
    return NextResponse.json({
      message: "Successfully Updated User Anime Data",
      userData: result.value,
    });
  } catch (err) {
    console.error("Error updating user anime data:", err);
    return NextResponse.json({ error: "Error Updating User Anime Data" }, { status: 500 });
  }
}
