"use client";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useMyList } from "@/components/utils/useMyList";
import { evolutionTier, firstName, type EvolutionTier } from "@/lib/landing";

/**
 * The one session model every session-aware landing island reads. The page
 * is static, so this is always "loading" during SSR and hydration (the
 * SessionProvider has no server session); islands render same-size
 * placeholders until it resolves.
 */
export type LandingSession =
  | { status: "loading" }
  | { status: "signedOut" }
  | {
      status: "signedIn";
      userId: string;
      /** Shown only to its owner. */
      firstName: string | null;
      /** List size including in-flight adds (useMyList().count); null while the ids load. */
      count: number | null;
      /** List size the server has confirmed: milestones and analytics use this one. */
      confirmedCount: number | null;
      tier: EvolutionTier;
    };

export function useLandingSession(): LandingSession {
  const { data: session, status } = useSession();
  const { count, confirmedCount } = useMyList();
  const userId = status === "authenticated" ? (session?.objectId ?? null) : null;
  const name = session?.user?.name ?? null;

  return useMemo<LandingSession>(() => {
    if (status === "loading") return { status: "loading" };
    if (!userId) return { status: "signedOut" };
    return {
      status: "signedIn",
      userId,
      firstName: firstName(name),
      count,
      confirmedCount,
      tier: evolutionTier(true, count),
    };
  }, [status, userId, name, count, confirmedCount]);
}
