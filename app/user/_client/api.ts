import { normalizeMedia } from "@/lib/anime/normalize";
import { SaveError, type SaveOutcome } from "@/lib/anime/trackQueue";
import type { UserAnimeData } from "@/lib/anime/types";
import { BUSY_ERROR, isUserAnimeData, progressBody, type ProgressRequest } from "@/lib/anime/userDataRequest";

export { SaveError };
export type { SaveOutcome };

const TIMEOUT_MS = 8_000;

/**
 * fetch + the JSON body under one deadline: a body that stalls after the
 * headers (a dying mobile connection) must not leave a save "in flight"
 * forever. Rejects on a network error or the deadline; `json` is null when the
 * body isn't JSON.
 */
async function fetchJson(resource: string, init: RequestInit): Promise<{ res: Response; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(resource, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }
    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

/** A progress response's stored airing fields (+1 or catch-up), sanitized like any stored media. */
function parseSnapshot(animeId: number, value: unknown): SaveOutcome["snapshot"] {
  if (typeof value !== "object" || value === null) return undefined;
  const media = normalizeMedia({ ...(value as object), id: animeId });
  if (!media) return undefined;
  return {
    status: media.status,
    episodes: media.episodes,
    upcomingEpisode: media.upcomingEpisode,
    upComingAirDate: media.upComingAirDate,
  };
}

/**
 * PATCH /api/anime-list/<id>/user-data with one of its four bodies
 * (lib/anime/userDataRequest.ts). Resolves with the saved userData and the
 * value it replaced; throws a SaveError whose message is the server's (or a
 * plain fallback) and whose `outcome` says whether the write could have
 * happened: `unknown` (no answer, a 5xx, busy) must never be resent blindly.
 */
export async function patchUserData(animeId: number, body: object): Promise<SaveOutcome> {
  let res: Response;
  let parsed: unknown;
  try {
    ({ res, json: parsed } = await fetchJson(`/api/anime-list/${animeId}/user-data`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
  } catch {
    // No answer, or the body never finished: the write may or may not have happened.
    throw new SaveError("Couldn't reach the server. Check your connection and try again.", "unknown", "offline");
  }

  const json = (typeof parsed === "object" && parsed !== null ? parsed : null) as {
    error?: unknown;
    code?: unknown;
    userData?: unknown;
    previous?: unknown;
    snapshot?: unknown;
  } | null;
  const message = typeof json?.error === "string" && json.error ? json.error : null;
  if (res.status === 401) {
    throw new SaveError("Your session has expired. Sign in again to edit your list.", "rejected", "signedOut");
  }
  if (res.status === 404) throw new SaveError(message ?? "Anime is not in your list", "rejected", "notOnList");
  if (res.status === 400) {
    throw new SaveError(message ?? "Couldn't save your changes (error 400).", "rejected", "invalid");
  }
  if (res.status === 409) {
    if (json?.code === "changed" && isUserAnimeData(json.userData)) {
      throw new SaveError(message ?? "This show changed elsewhere, so nothing was saved.", "changed", "changed", json.userData);
    }
    throw new SaveError(message ?? BUSY_ERROR, "unknown", "busy");
  }
  if (!res.ok || !isUserAnimeData(json?.userData)) {
    throw new SaveError(
      (!res.ok && message) || `Couldn't save your changes (error ${res.status}).`,
      "unknown",
      "server"
    );
  }
  return {
    userData: json.userData,
    previous: isUserAnimeData(json.previous) ? json.previous : null,
    snapshot: parseSnapshot(animeId, json.snapshot),
  };
}

/**
 * An absolute write (the Edit dialog). Resolves with the userData the server
 * saved (after its auto-complete / date rules); throws Error(<server message>).
 */
export const saveUserData = (animeId: number, userData: Partial<UserAnimeData>) =>
  patchUserData(animeId, { userData }).then((outcome) => outcome.userData);

/** +1 taps (`{increment}`) or "Log N new" (`{catchUpTo}`), applied to the stored value. */
export const logEpisodes = (animeId: number, op: ProgressRequest) => patchUserData(animeId, progressBody(op));

/** Undo: restores `restore` only while the entry still equals `expect` (else a `changed` SaveError). */
export const undoUserData = (animeId: number, restore: UserAnimeData, expect: UserAnimeData) =>
  patchUserData(animeId, { userData: restore, expect });

async function fetchListUserData(ownerId: string): Promise<Map<number, unknown>> {
  const { res, json } = await fetchJson(`/api/anime-list/user/${ownerId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Couldn't read the list (error ${res.status}).`);
  const list = (json as { list?: unknown } | null)?.list;
  if (!Array.isArray(list)) throw new Error("Couldn't read the list.");
  const byId = new Map<number, unknown>();
  for (const item of list) {
    if (typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "number") {
      byId.set((item as { id: number }).id, (item as { userData?: unknown }).userData);
    }
  }
  return byId;
}

/** Reads asked for in the same tick share one GET; a read asked for later starts a new one (it must see later writes). */
let pendingRead: { ownerId: string; result: Promise<Map<number, unknown>> } | null = null;

/**
 * One show's stored userData, from GET /api/anime-list/user/<ownerId> (after a
 * save whose outcome is unknown). Several cards failing at once share one GET.
 * Null when the show isn't on the list; throws when the list can't be read.
 */
export async function readListUserData(ownerId: string, animeId: number): Promise<UserAnimeData | null> {
  if (!pendingRead || pendingRead.ownerId !== ownerId) {
    const batch: { ownerId: string; result: Promise<Map<number, unknown>> } = {
      ownerId,
      result: new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
        if (pendingRead === batch) pendingRead = null;
        return fetchListUserData(ownerId);
      }),
    };
    pendingRead = batch;
  }
  const byId = await pendingRead.result;
  if (!byId.has(animeId)) return null;
  const userData = byId.get(animeId);
  if (!isUserAnimeData(userData)) throw new Error("Couldn't read the list.");
  return userData;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error && err.message ? err.message : "Something went wrong, please try again.";
