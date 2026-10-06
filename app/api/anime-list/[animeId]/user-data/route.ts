import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { toObjectId, usersCollection } from "@/server/lib/userList";
import { writeUserData } from "@/server/lib/userDataWrite";
import { BUSY_ERROR, CHANGED_ERROR, REQUIRED_ERROR, parseUserDataRequest } from "@/lib/anime/userDataRequest";

/**
 * PATCH → update one entry on the caller's list. Four bodies
 * (lib/anime/userDataRequest.ts):
 * - `{ userData }`: an absolute write (the Edit dialog)
 * - `{ userData, expect }`: Undo; applies only while the entry still equals `expect`
 * - `{ increment: 1–100 }`: +1 taps, added to the stored progress
 * - `{ catchUpTo }`: "Log N new"
 * Neither logs past what has aired by the server's clock.
 * Validation and tracker rules (auto-complete, start/finish dates) live in
 * lib/anime/normalize.ts#normalizeUserData; the write is a compare-and-set on
 * the stored entry (server/lib/userDataWrite.ts).
 *
 * 200 `{ message, userData, previous }`: `previous` is the stored value the
 * write replaced (equal to `userData` when nothing changed). An increment's or
 * a catch-up's response adds `snapshot`, the stored airing fields it counted
 * from, so the card's +1 and "Log N new" agree with the server. 409 `{ error,
 * code: "changed", userData }` when an Undo's entry changed (userData = stored),
 * 409 `{ error, code: "busy" }` after losing the race three times.
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
  const body: unknown = await request.json().catch(() => null);
  if (!Number.isInteger(animeId) || animeId <= 0) {
    return NextResponse.json({ error: REQUIRED_ERROR }, { status: 400 });
  }
  const parsed = parseUserDataRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await writeUserData(await usersCollection(), {
      userId,
      animeId,
      request: parsed.request,
    });
    switch (result.kind) {
      case "ok":
        return NextResponse.json({
          message: "Successfully Updated User Anime Data",
          userData: result.userData,
          previous: result.previous,
          ...(parsed.request.kind !== "set" ? { snapshot: result.snapshot } : {}),
        });
      case "not-found":
        return NextResponse.json({ error: "Anime is not in your list" }, { status: 404 });
      case "invalid":
        return NextResponse.json({ error: result.error }, { status: 400 });
      case "changed":
        return NextResponse.json(
          { error: CHANGED_ERROR, code: "changed", userData: result.userData },
          { status: 409 }
        );
      case "busy":
        return NextResponse.json({ error: BUSY_ERROR, code: "busy" }, { status: 409 });
    }
  } catch (err) {
    console.error("Error updating user anime data:", err);
    return NextResponse.json({ error: "Error Updating User Anime Data" }, { status: 500 });
  }
}
