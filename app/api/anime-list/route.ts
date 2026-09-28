import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { toObjectId, usersCollection } from "@/server/lib/userList";
import { normalizeMedia } from "@/lib/anime/normalize";
import { DEFAULT_USER_DATA, ListEntry, isListStatus } from "@/lib/anime/types";

/**
 * POST   { data: AniListMedia, status?: ListStatus } → add to the caller's list
 * DELETE { data: { id: number } }                    → remove from the caller's list
 *
 * Clients branch on the exact `message` strings below; keep them stable.
 */

/** Keeps a user document well under MongoDB's 16 MB limit. */
const MAX_LIST_SIZE = 2_000;

const unauthorized = () =>
  NextResponse.json({ error: "User is not authenticated" }, { status: 401 });

const readJson = async (request: NextRequest): Promise<Record<string, any> | null> => {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = toObjectId(session?.objectId);
  if (!userId) return unauthorized();

  const body = await readJson(request);
  const media = normalizeMedia(body?.data);
  if (!media) {
    return NextResponse.json(
      { error: "Anime data with a numeric id is required" },
      { status: 400 }
    );
  }

  const entry: ListEntry = {
    ...media,
    userData: {
      ...DEFAULT_USER_DATA,
      listType: isListStatus(body?.status) ? body.status : DEFAULT_USER_DATA.listType,
    },
  };

  try {
    const users = await usersCollection();
    // Atomic "add if absent": the filter only matches when the id isn't there yet.
    const res = await users.updateOne(
      {
        _id: userId,
        "following.id": { $ne: media.id },
        [`following.${MAX_LIST_SIZE - 1}`]: { $exists: false },
      },
      { $push: { following: entry } }
    );
    if (res.modifiedCount > 0) {
      return NextResponse.json({ message: "Successfully Added to List", entry });
    }
    const alreadyThere = await users.countDocuments({ _id: userId, "following.id": media.id });
    if (alreadyThere) return NextResponse.json({ message: "Already In List" });
    return NextResponse.json(
      { error: `Your list is full (${MAX_LIST_SIZE.toLocaleString("en-US")} shows)` },
      { status: 409 }
    );
  } catch (err) {
    console.error("Error adding to anime list:", err);
    return NextResponse.json({ error: "Failed to add anime to list" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = toObjectId(session?.objectId);
  if (!userId) return unauthorized();

  const body = await readJson(request);
  const animeId = Number(body?.data?.id);
  if (!Number.isInteger(animeId) || animeId <= 0) {
    return NextResponse.json({ error: "Anime data with id is required" }, { status: 400 });
  }

  try {
    const users = await usersCollection();
    const res = await users.updateOne(
      { _id: userId },
      { $pull: { following: { id: animeId } } }
    );
    if (res.modifiedCount > 0) {
      return NextResponse.json({ message: "Successfully Removed From List" });
    }
    return NextResponse.json({ message: "Did Not Remove" });
  } catch (err) {
    console.error("Error removing from anime list:", err);
    return NextResponse.json({ error: "Failed to remove anime from list" }, { status: 500 });
  }
}
