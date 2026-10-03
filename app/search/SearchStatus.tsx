"use client";
import { useState } from "react";
import { searchStatusSnapshot, useSearchStatus } from "@/components/utils/searchArrival";

/**
 * /search's one spoken channel (skill rule 9), fed by searchArrival.ts. It
 * lives in the layout, so it persists across searches. It shows only lines
 * written since it mounted: the store outlives /search, and a region that
 * mounts holding an old line could read out a count from another visit. A
 * zero-width toggle makes an identical line (the same search again) a change
 * the screen reader announces.
 */
export default function SearchStatus() {
  const { text, count } = useSearchStatus();
  // The store's count when this region mounted (a mount-time read, never updated).
  const [since] = useState(() => searchStatusSnapshot().count);
  const live = count > since ? text : "";
  return (
    <p role="status" className="sr-only">
      {live}
      {live && count % 2 ? "​" : ""}
    </p>
  );
}
