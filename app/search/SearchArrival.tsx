"use client";
import { useEffect } from "react";
import { arriveAtSearch } from "@/components/utils/searchArrival";
import { SEARCH_LIST_TITLE_ID, SEARCH_TITLE_ID } from "@/lib/search";

/**
 * Renders nothing. When a search the reader started arrives (a token for this
 * query and page), it speaks the outcome and moves focus: the Results h2
 * after paging, else the h1 (also when there is no h2: no results, past the
 * end, an error). It never takes focus the reader already put somewhere (the
 * nav search, say). A full load, Retry or Back/Forward has no token: focus
 * stays put and the status line empties.
 */
export default function SearchArrival({ query, page, status }: { query: string; page: number; status: string }) {
  useEffect(() => {
    const target = arriveAtSearch(query, page, status);
    if (!target) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const list = target === "list" ? document.getElementById(SEARCH_LIST_TITLE_ID) : null;
    // focus() scrolls the heading into view only if needed; scroll-mt-20 clears the sticky nav.
    (list ?? document.getElementById(SEARCH_TITLE_ID))?.focus();
  }, [query, page, status]);
  return null;
}
