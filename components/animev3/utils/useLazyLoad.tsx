"use client";
import { useCallback, useState } from "react";

/** Cards revealed per step. The first chunk is part of the server HTML. */
export const REVEAL_CHUNK = 12;

interface UseLazyLoadOptions {
  /** Items available locally (already fetched). */
  total: number;
  /** Whether another page can be fetched once every local item is visible. */
  canFetchMore: boolean;
  /** Fetches the next page. Must guard against concurrent calls itself. */
  fetchMore: () => void;
  chunkSize?: number;
}

/**
 * Reveals items in chunks while a sentinel element is on screen, and asks for
 * the next page once everything fetched so far is visible.
 *
 * The sentinel ref callback is recreated whenever the state it depends on
 * changes; a fresh IntersectionObserver reports the sentinel's current
 * intersection immediately, so revealing continues while it stays in view.
 */
export default function useLazyLoad({
  total,
  canFetchMore,
  fetchMore,
  chunkSize = REVEAL_CHUNK,
}: UseLazyLoadOptions) {
  const [requested, setRequested] = useState(chunkSize);
  const visibleCount = Math.min(requested, total);
  const hasMore = visibleCount < total || canFetchMore;

  const onSentinelVisible = useCallback(() => {
    if (visibleCount < total) {
      setRequested(visibleCount + chunkSize);
    } else if (canFetchMore) {
      fetchMore();
    }
  }, [visibleCount, total, canFetchMore, fetchMore, chunkSize]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) onSentinelVisible();
        },
        { rootMargin: "0px 0px 600px 0px" }
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [onSentinelVisible]
  );

  return { visibleCount, hasMore, sentinelRef };
}
