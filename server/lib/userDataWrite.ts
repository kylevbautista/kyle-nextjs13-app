import type { Collection, Filter, ObjectId } from "mongodb";
import { normalizeEntry } from "@/lib/anime/normalize";
import type { ListEntry, UserAnimeData } from "@/lib/anime/types";
import { applyUserDataRequest, type UserDataRequest } from "@/lib/anime/userDataRequest";
import type { UserDoc } from "./userList";

/**
 * One userData write (PATCH /api/anime-list/<id>/user-data): read the stored
 * entry, apply the request to it (lib/anime/userDataRequest.ts), and write the
 * result only if the entry still holds exactly what was read. A write that
 * loses a race (another tab's +1, the Edit dialog, a second device) re-reads
 * and recomputes from the new stored value, so an increment is never applied
 * to a stale number and the tracker rules always see the value they replace.
 *
 * Type-only imports of mongodb and UserDoc keep this testable with a fake
 * collection.
 */

type Users = Pick<Collection<UserDoc>, "findOne" | "updateOne">;

/** The stored airing fields a +1 or a catch-up counted from (sent back so the card's +1 and chip agree). */
export type AiringSnapshot = Pick<ListEntry, "status" | "episodes" | "upcomingEpisode" | "upComingAirDate">;

const airingSnapshot = (entry: ListEntry): AiringSnapshot => ({
  status: entry.status,
  episodes: entry.episodes,
  upcomingEpisode: entry.upcomingEpisode,
  upComingAirDate: entry.upComingAirDate,
});

export type WriteResult =
  /** `previous` is the stored value the write replaced (equal to `userData` when nothing changed). */
  | { kind: "ok"; userData: UserAnimeData; previous: UserAnimeData; snapshot: AiringSnapshot }
  | { kind: "not-found" }
  | { kind: "invalid"; error: string }
  /** An Undo whose `expect` no longer matches: nothing written; `userData` is the stored value. */
  | { kind: "changed"; userData: UserAnimeData }
  /** Lost the race on every attempt. */
  | { kind: "busy" };

const USER_DATA_FIELDS = ["listType", "episodeProgressNumber", "startDate", "finishDate", "score"] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * A condition that matches a raw stored value exactly as it was read. Always an
 * operator, so a hostile stored object is never read as a query. Objects match
 * by type, not `$eq`: JavaScript reorders integer-like keys, so a round-tripped
 * object would never equal the stored BSON and the entry would stay locked.
 */
export function pin(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return { $eq: null }; // also matches a missing field
  if (Array.isArray(value)) return { $type: "array" };
  if (isPlainObject(value)) return { $type: "object" };
  return { $eq: value };
}

/**
 * The compare-and-set filter: the first `following` element with this id whose
 * raw userData fields (and episode count, which the clamp and auto-complete
 * read) still equal what was read. Raw values, never normalized ones: a legacy
 * "5" pins "5". The positional `$` in the update writes that same element.
 */
export function casFilter(userId: ObjectId, animeId: number, raw: unknown): Filter<UserDoc> {
  const entry = isPlainObject(raw) ? raw : {};
  const userData = isPlainObject(entry.userData) ? entry.userData : {};
  const match: Record<string, unknown> = { id: animeId, episodes: pin(entry.episodes) };
  for (const field of USER_DATA_FIELDS) match[`userData.${field}`] = pin(userData[field]);
  return { _id: userId, following: { $elemMatch: match } } as Filter<UserDoc>;
}

export async function writeUserData(
  users: Users,
  {
    userId,
    animeId,
    request,
    now = () => Date.now(),
    attempts = 3,
  }: { userId: ObjectId; animeId: number; request: UserDataRequest; now?: () => number; attempts?: number }
): Promise<WriteResult> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const doc = await users.findOne(
      { _id: userId, "following.id": animeId },
      { projection: { "following.$": 1 } }
    );
    // The first element with that id: the one lists show (normalizeEntry drops later duplicates).
    const raw = doc?.following?.[0];
    const entry = normalizeEntry(raw);
    if (!entry) return { kind: "not-found" };

    const result = applyUserDataRequest(request, entry, now());
    if (!result.ok) {
      return result.code === "changed"
        ? { kind: "changed", userData: entry.userData }
        : { kind: "invalid", error: result.error };
    }
    if (!result.changed) {
      return { kind: "ok", userData: entry.userData, previous: entry.userData, snapshot: airingSnapshot(entry) };
    }

    const write = await users.updateOne(casFilter(userId, animeId, raw), {
      $set: { "following.$.userData": result.value },
    });
    // matchedCount, not modifiedCount: an equal write matches but modifies nothing.
    if (write.matchedCount === 1) {
      return { kind: "ok", userData: result.value, previous: entry.userData, snapshot: airingSnapshot(entry) };
    }
    // Lost a race (or the entry was removed): read again and recompute.
  }
  return { kind: "busy" };
}
