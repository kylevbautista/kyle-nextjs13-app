"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import useSWR, { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { displayTitle } from "@/lib/anime/types";
import type { AnimeMedia, ListStatus } from "@/lib/anime/types";

/**
 * The signed-in user's list membership, shared by every anime card.
 *
 * - SWR key `/api/anime-list/ids` holds the ids the server has confirmed.
 * - A module-level overlay holds changes still in flight, so every card shows
 *   them immediately and concurrent add/remove clicks can't clobber each other
 *   (SWR's own optimistic mutate drops overlapping async mutations).
 * - A confirmed change is committed to the SWR cache with a synchronous
 *   functional update; a failed one just leaves the overlay (i.e. rolls back).
 * - After any change, open Airing Schedules (scheduleSwrKey) revalidate.
 */

export const MY_LIST_IDS_KEY = "/api/anime-list/ids";

/** SWR key of the Airing Schedule for `userId` (see components/mylist/AiringSchedule.tsx). */
export const scheduleSwrKey = (userId: string) => `/mylist/${userId}`;
const isScheduleKey = (key: unknown) => typeof key === "string" && key.startsWith("/mylist/");

type PendingOp = "add" | "remove";
let pendingOps: ReadonlyMap<number, PendingOp> = new Map();
const pendingListeners = new Set<() => void>();

function setPending(id: number, op: PendingOp | null) {
  const next = new Map(pendingOps);
  if (op) next.set(id, op);
  else next.delete(id);
  pendingOps = next;
  pendingListeners.forEach((notify) => notify());
}

const subscribePending = (listener: () => void) => {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
};
const getPending = () => pendingOps;
const EMPTY_PENDING: ReadonlyMap<number, PendingOp> = new Map();
const getServerPending = () => EMPTY_PENDING;

async function fetchListIds(url: string): Promise<number[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error(`Could not load your list (${res.status})`);
  const body = await res.json();
  return Array.isArray(body?.ids) ? body.ids : [];
}

async function sendListChange(method: "POST" | "DELETE", payload: unknown) {
  const res = await fetch("/api/anime-list", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Sign in to manage your list");
  if (!res.ok) throw new Error(body?.error || "Something went wrong, please try again");
  return body as { message?: string };
}

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong, please try again";

export function useMyList() {
  const { data: session, status: sessionStatus } = useSession();
  const signedIn = sessionStatus === "authenticated";
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data: ids, error, mutate } = useSWR(signedIn ? MY_LIST_IDS_KEY : null, fetchListIds, {
    dedupingInterval: 5_000,
  });
  const pending = useSyncExternalStore(subscribePending, getPending, getServerPending);

  const idSet = useMemo(() => {
    const set = new Set(ids ?? []);
    pending.forEach((op, id) => (op === "add" ? set.add(id) : set.delete(id)));
    return set;
  }, [ids, pending]);

  const change = useCallback(
    async (media: Pick<AnimeMedia, "id" | "title">, op: PendingOp, status?: ListStatus) => {
      // Without a session the SWR key is null and nothing would be sent.
      if (!signedIn) {
        toast.error("Sign in to manage your list");
        return false;
      }
      setPending(media.id, op);
      try {
        if (op === "add") await sendListChange("POST", { data: media, status });
        else await sendListChange("DELETE", { data: { id: media.id } });
        await mutate(
          (current: number[] = []) =>
            op === "add"
              ? current.includes(media.id)
                ? current
                : [...current, media.id]
              : current.filter((id) => id !== media.id),
          { revalidate: false }
        );
        toast.success(
          op === "add"
            ? `Added ${displayTitle(media)} to your list`
            : `Removed ${displayTitle(media)} from your list`
        );
        mutateGlobal(isScheduleKey);
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setPending(media.id, null);
      }
    },
    [signedIn, mutate, mutateGlobal]
  );

  const add = useCallback(
    (media: AnimeMedia, status?: ListStatus) => change(media, "add", status),
    [change]
  );
  const remove = useCallback(
    (media: Pick<AnimeMedia, "id" | "title">) => change(media, "remove"),
    [change]
  );

  return {
    sessionStatus,
    signedIn,
    /** The signed-in user's id (list URLs are /user/<userId>). */
    userId: session?.objectId ?? null,
    /**
     * False until the signed-in user's list ids have loaded. If loading failed,
     * cards fall back to "Add" (the API answers "Already In List" for duplicates)
     * while SWR keeps retrying in the background.
     */
    loaded: !signedIn || ids !== undefined || error !== undefined,
    /**
     * How many shows are on the list, including in-flight adds/removes; null
     * while signed out or until the ids have loaded (or when loading failed).
     */
    count: signedIn && ids !== undefined ? idSet.size : null,
    isInList: (id: number) => idSet.has(id),
    /** True while an add/remove for this id is in flight. */
    isPending: (id: number) => pending.has(id),
    add,
    remove,
  };
}
