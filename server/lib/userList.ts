import { Collection, ObjectId } from "mongodb";
import { after } from "next/server";
import type { Session } from "next-auth";
import { getDb } from "./mongodb";
import { fetchMediaByIds } from "./anilist";
import { MEDIA_SNAPSHOT_FIELDS, normalizeEntry } from "@/lib/anime/normalize";
import type { AnimeMedia, ListEntry } from "@/lib/anime/types";

/**
 * Everything that reads or writes a user's watchlist goes through here.
 *
 * Storage: `users.following[]` (embedded in the NextAuth `users` document),
 * one entry per AniList id, each an AnimeMedia snapshot + `userData`.
 *
 * Public identity: list URLs use the user's ObjectId hex (`/user/<id>`).
 * Legacy `/user/<base64url(email)>` links only resolve for their owner (who is
 * redirected to the id URL), so emails are never exposed or enumerable.
 */

export interface UserDoc {
  _id: ObjectId;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  following?: unknown[];
  /** Epoch ms of the last server-side AniList refresh of `following`. */
  listRefreshedAt?: number;
}

export const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export async function usersCollection(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export const toObjectId = (id: string | null | undefined): ObjectId | null =>
  id && OBJECT_ID_RE.test(id) ? new ObjectId(id) : null;

const decodeLegacyEmailParam = (param: string): string | null => {
  try {
    const decoded = Buffer.from(param, "base64url").toString("utf8");
    return decoded.includes("@") ? decoded : null;
  } catch {
    return null;
  }
};

export type ListOwnerLookup =
  | { kind: "found"; user: UserDoc; userId: string; isOwner: boolean }
  | { kind: "redirect"; userId: string }
  | { kind: "not-found" };

const OWNER_PROJECTION = {
  name: 1,
  image: 1,
  following: 1,
  listRefreshedAt: 1,
} as const;

/**
 * Resolves the `[...user]` route segment of /user and /mylist.
 * `param` is a user ObjectId hex, or a legacy base64url(email) (owner only).
 */
export async function resolveListOwner(
  param: string | null | undefined,
  viewer: Session | null
): Promise<ListOwnerLookup> {
  if (!param) return { kind: "not-found" };
  let value: string;
  try {
    value = decodeURIComponent(param);
  } catch {
    return { kind: "not-found" }; // malformed %-escape
  }

  const objectId = toObjectId(value);
  if (objectId) {
    const users = await usersCollection();
    const user = await users.findOne({ _id: objectId }, { projection: OWNER_PROJECTION });
    if (!user) return { kind: "not-found" };
    const userId = user._id.toHexString();
    return { kind: "found", user, userId, isOwner: viewer?.objectId === userId };
  }

  const legacyEmail = decodeLegacyEmailParam(value);
  if (legacyEmail && viewer?.objectId && viewer.user?.email === legacyEmail) {
    return { kind: "redirect", userId: viewer.objectId };
  }
  return { kind: "not-found" };
}

/** Loads the list document for a known user id (e.g. the signed-in user). */
export async function findUserById(userId: string): Promise<UserDoc | null> {
  const objectId = toObjectId(userId);
  if (!objectId) return null;
  const users = await usersCollection();
  return users.findOne({ _id: objectId }, { projection: OWNER_PROJECTION });
}

/** Normalized entries; drops malformed ones and duplicate ids (older writes could race). */
export const readEntries = (user: Pick<UserDoc, "following">): ListEntry[] => {
  const seen = new Set<number>();
  return (user.following ?? [])
    .map(normalizeEntry)
    .filter((entry): entry is ListEntry => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
};

/** AniList ids on a user's list (drives the "On my list" state of cards). */
export async function getListIds(userId: string): Promise<number[]> {
  const objectId = toObjectId(userId);
  if (!objectId) return [];
  const users = await usersCollection();
  const doc = await users.findOne({ _id: objectId }, { projection: { "following.id": 1 } });
  return (doc?.following ?? [])
    .map((entry) => Number((entry as { id?: unknown })?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

// ---------------------------------------------------------------------------
// Server-side air-date refresh
// ---------------------------------------------------------------------------

export const LIST_REFRESH_MAX_AGE_MS = 10 * 60 * 1000;
/** At most this many shows (3 AniList requests) per refresh; AniList allows ~30 requests/min. */
export const LIST_REFRESH_MAX_ENTRIES = 150;
/** After a failed refresh (e.g. AniList 429), try again after this long instead. */
const LIST_REFRESH_RETRY_MS = 60 * 1000;
const LIST_REFRESH_TIMEOUT_MS = 4_000;
const SETTLED_STATUSES = new Set(["FINISHED", "CANCELLED"]);

/** Finished/cancelled shows never get new episodes, so they are not refreshed. */
export const needsRefresh = (entry: AnimeMedia) =>
  !entry.status || !SETTLED_STATUSES.has(entry.status);

const REFRESH_PRIORITY: Record<string, number> = { RELEASING: 0, HIATUS: 1, NOT_YET_RELEASED: 2 };

/** Which entries to refresh: airing shows first, capped at LIST_REFRESH_MAX_ENTRIES. */
export const refreshCandidates = (entries: ListEntry[]) =>
  entries
    .filter(needsRefresh)
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) =>
        (REFRESH_PRIORITY[a.entry.status ?? ""] ?? 3) - (REFRESH_PRIORITY[b.entry.status ?? ""] ?? 3) ||
        a.index - b.index
    )
    .slice(0, LIST_REFRESH_MAX_ENTRIES)
    .map(({ entry }) => entry);

const snapshotUpdate = (media: AnimeMedia) => {
  const set: Record<string, unknown> = {};
  for (const field of MEDIA_SNAPSHOT_FIELDS) {
    set[`following.$.${field}`] = media[field] ?? null;
  }
  return set;
};

class RefreshTimeout extends Error {}

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RefreshTimeout(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

/**
 * Re-fetches airing data for not-yet-finished entries when the list was last
 * refreshed more than LIST_REFRESH_MAX_AGE_MS ago. At most one request per
 * user does the work (the `listRefreshedAt` update acts as a lock). Any
 * failure or timeout returns the stored entries unchanged — pages never fail
 * because AniList is slow. `userData` is never touched.
 */
export async function refreshEntriesIfStale(
  user: Pick<UserDoc, "_id" | "listRefreshedAt">,
  entries: ListEntry[],
  { now = Date.now(), maxAgeMs = LIST_REFRESH_MAX_AGE_MS } = {}
): Promise<ListEntry[]> {
  const stale = refreshCandidates(entries);
  if (!stale.length) return entries;
  if (user.listRefreshedAt && now - user.listRefreshedAt < maxAgeMs) return entries;

  try {
    const users = await usersCollection();
    const claim = await users.updateOne(
      {
        _id: user._id,
        $or: [
          { listRefreshedAt: { $exists: false } },
          { listRefreshedAt: { $lt: now - maxAgeMs } },
        ],
      },
      { $set: { listRefreshedAt: now } }
    );
    if (claim.modifiedCount === 0) return entries;

    // Shorten the lock so a failed refresh is retried in a minute, not ten.
    const releaseForRetry = () =>
      users
        .updateOne(
          { _id: user._id, listRefreshedAt: now },
          { $set: { listRefreshedAt: now - maxAgeMs + LIST_REFRESH_RETRY_MS } }
        )
        .catch(() => undefined);

    // Each batch of 50 is written as soon as it arrives, so a later failure
    // (e.g. a 429 on batch 3) keeps the progress already made.
    const work = fetchMediaByIds(
      stale.map((entry) => entry.id),
      async (batch) => {
        await users.bulkWrite(
          batch.map((media) => ({
            updateOne: {
              filter: { _id: user._id, "following.id": media.id },
              update: { $set: snapshotUpdate(media) },
            },
          })),
          { ordered: false }
        );
      }
    );

    let fresh: AnimeMedia[];
    try {
      fresh = await withTimeout(work, LIST_REFRESH_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof RefreshTimeout) {
        // Too slow for this render: let it finish after the response is sent
        // (the next view gets the fresh data) instead of throwing the work away.
        const finish = () =>
          work.catch(async (e) => {
            console.error("List refresh failed:", (e as Error)?.message ?? e);
            await releaseForRetry();
          });
        try {
          after(finish);
        } catch {
          void finish();
        }
      } else {
        await releaseForRetry();
      }
      throw err;
    }

    const byId = new Map(fresh.map((media) => [media.id, media]));
    return entries.map((entry) => {
      const media = byId.get(entry.id);
      return media ? { ...entry, ...media, userData: entry.userData } : entry;
    });
  } catch (err) {
    console.error("List refresh skipped:", (err as Error)?.message ?? err);
    return entries;
  }
}

/** Normalized entries for a user, refreshed from AniList when stale. */
export async function loadListEntries(user: UserDoc): Promise<ListEntry[]> {
  return refreshEntriesIfStale(user, readEntries(user));
}
