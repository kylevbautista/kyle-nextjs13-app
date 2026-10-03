"use client";
import { useEffect } from "react";
import { announcePending, holdSearchFocus, searchStatusSnapshot } from "@/components/utils/searchArrival";
import { loadingStatus } from "@/lib/anime/searchCopy";

/**
 * Renders nothing. "Searching AniList for “q”…", only for a search the reader
 * started (its token), never on a full load; it also restarts the token's
 * clock, since the wait for AniList starts now. Said once (React StrictMode
 * replays the effect in development).
 */
export default function SearchPendingStatus({ query, page }: { query: string; page: number }) {
  useEffect(() => {
    if (!holdSearchFocus(query, page)) return;
    const line = loadingStatus(query, page);
    if (searchStatusSnapshot().text !== line) announcePending(line);
  }, [query, page]);
  return null;
}
