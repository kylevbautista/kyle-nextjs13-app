"use client";
import { useEffect } from "react";
import { announcePending, holdSearchFocus, searchStatusSnapshot } from "@/components/utils/searchArrival";

/**
 * Renders nothing. "Searching AniList for “q”…" (`line`), only for a search
 * the reader started (its token for `searchKey`), never on a full load; it
 * also restarts the token's clock, since the wait for AniList starts now, and
 * records the search as the one on screen. Said once (React StrictMode
 * replays the effect in development).
 */
export default function SearchPendingStatus({ searchKey, line }: { searchKey: string; line: string }) {
  useEffect(() => {
    if (!holdSearchFocus(searchKey)) return;
    if (searchStatusSnapshot().text !== line) announcePending(line);
  }, [searchKey, line]);
  return null;
}
