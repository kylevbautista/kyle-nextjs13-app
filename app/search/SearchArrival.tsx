"use client";
import { useEffect } from "react";
import { arriveAtSearch } from "@/components/utils/searchArrival";
import { SEARCH_LIST_TITLE_ID, SEARCH_TITLE_ID } from "@/lib/search";

/**
 * Renders nothing. When a search the reader started arrives (a token for this
 * search's key: query, filters, page), it speaks the outcome and moves focus: the Results h2
 * after paging, else the h1 (also when there is no h2: no results, past the
 * end, an error). It never takes focus the reader already put somewhere (the
 * nav search, say). A full load, Retry or Back/Forward has no token: focus
 * stays put and the status line empties.
 */
export default function SearchArrival({ searchKey, status }: { searchKey: string; status: string }) {
  useEffect(() => {
    const target = arriveAtSearch(searchKey, status);
    if (!target) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const list = target === "list" ? document.getElementById(SEARCH_LIST_TITLE_ID) : null;
    // focus() scrolls the heading into view only if needed; scroll-mt-20 clears the sticky nav.
    (list ?? document.getElementById(SEARCH_TITLE_ID))?.focus();
  }, [searchKey, status]);
  return null;
}
