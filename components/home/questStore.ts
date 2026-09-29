"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Quest 2 (opened the Airing Schedule) and Quest 3 (copied the list link)
 * flags, per user and per device: localStorage "kv:quests:{userId}", with an
 * in-memory copy for when storage is blocked. Written only from click
 * handlers (markQuest); read with useSyncExternalStore, whose server snapshot
 * is "nothing done", so SSR and hydration always agree.
 */

export interface QuestFlags {
  schedule: boolean;
  share: boolean;
}

export type FlagQuest = keyof QuestFlags;

const NONE: QuestFlags = Object.freeze({ schedule: false, share: false });
const storageKey = (userId: string) => `kv:quests:${userId}`;

/** Flags set this page view (survive blocked storage). */
const memory = new Map<string, QuestFlags>();
const listeners = new Set<() => void>();
/** Last snapshot per user, so unchanged reads return the same object. */
const snapshots = new Map<string, { signature: string; flags: QuestFlags }>();

function readStored(userId: string): Partial<QuestFlags> {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return {};
    const { schedule, share } = parsed as Record<string, unknown>;
    return { schedule: schedule === true, share: share === true };
  } catch {
    return {};
  }
}

function snapshot(userId: string): QuestFlags {
  const stored = readStored(userId);
  const remembered = memory.get(userId) ?? NONE;
  const schedule = stored.schedule === true || remembered.schedule;
  const share = stored.share === true || remembered.share;
  const signature = `${schedule}|${share}`;
  const cached = snapshots.get(userId);
  if (cached?.signature === signature) return cached.flags;
  const flags = { schedule, share };
  snapshots.set(userId, { signature, flags });
  return flags;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Other tabs finishing a quest.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("kv:quests:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => NONE;

export function useQuestFlags(userId: string | null): QuestFlags {
  const getSnapshot = useCallback(() => (userId ? snapshot(userId) : NONE), [userId]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Marks a quest done for this user on this device. Call from event handlers. */
export function markQuest(userId: string, quest: FlagQuest): void {
  const next = { ...(memory.get(userId) ?? NONE), [quest]: true };
  memory.set(userId, next);
  try {
    const stored = readStored(userId);
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ schedule: stored.schedule === true || next.schedule, share: stored.share === true || next.share })
    );
  } catch {
    // Blocked storage: the in-memory flag still counts for this page view.
  }
  listeners.forEach((notify) => notify());
}
