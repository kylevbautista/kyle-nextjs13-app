"use client";
import ListToggle from "@/components/animev3/ListToggle";
import type { ListStatus } from "@/lib/anime/types";
import { trackLanding, type LandingLocation } from "./analytics";
import { useLanding } from "./LandingProvider";

/**
 * The add button on every landing card (Magic Sense, Tempest, quests): the
 * shared ListToggle with the page's full media snapshot, the sign-in intent
 * dialog for signed-out visitors, and list_add analytics. Renders nothing for
 * an id the page doesn't have a snapshot for.
 */
export default function LandingAddButton({
  id,
  status,
  label,
  location,
  size = "block",
}: {
  id: number;
  status?: ListStatus;
  label?: string;
  location: LandingLocation;
  size?: "block" | "pill";
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
    />
  );
}
