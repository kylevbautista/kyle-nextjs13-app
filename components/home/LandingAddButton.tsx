"use client";
import ListToggle from "@/components/animev3/ListToggle";
import type { AnimeActionResult } from "@/lib/anime/cardLabels";
import type { ListStatus } from "@/lib/anime/types";
import { trackLanding, type LandingLocation } from "./analytics";
import { useLanding } from "./LandingProvider";

/**
 * The add button on every landing card (Magic Sense, Tempest, quests): the
 * shared ListToggle with the page's full media snapshot, the sign-in intent
 * dialog for signed-out visitors, and list_add analytics. Renders nothing for
 * an id the page doesn't have a snapshot for. `onResult` is the details
 * sheet's (it speaks the outcome itself; signed out, the intent dialog opens
 * and nothing is reported).
 */
export default function LandingAddButton({
  id,
  status,
  label,
  location,
  size = "block",
  onResult,
}: {
  id: number;
  status?: ListStatus;
  label?: string;
  location: LandingLocation;
  size?: "block" | "pill" | "fill";
  onResult?: (result: AnimeActionResult) => void;
}) {
  const { media, openSignInIntent } = useLanding();
  const info = media(id);
  if (!info) return null;

  return (
    <ListToggle
      info={info}
      addStatus={status}
      addLabel={label}
      size={size}
      onSignedOutAdd={(_, trigger) => openSignInIntent({ id, status, location, trigger })}
      onAdd={() => trackLanding("list_add", { location, status: status ?? "watching" })}
      onResult={onResult}
    />
  );
}
