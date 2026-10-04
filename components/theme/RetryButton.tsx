"use client";
import { useTransition } from "react";

/**
 * A failed retry mounts a fresh error page, which would drop keyboard focus to <body>. A press with
 * focus leaves this time; the next RetryButton to mount within 10 s takes focus back (a ref
 * callback, never render). Shared by app/error.tsx and app/global-error.tsx (the season and Top
 * Anime errors keep their own).
 */
let retryFocusAt = 0;

/**
 * "Try again" for an error page: Next 16.3's retry() (refetch + re-render) in a transition;
 * aria-disabled keeps focus while pending. No Tailwind of its own: global-error passes plain CSS
 * classes.
 */
export default function RetryButton({
  retry,
  label,
  pendingLabel,
  className,
}: {
  retry: () => void;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      ref={(node) => {
        // Runs on every render too: only a fresh page whose focus fell to <body> takes it.
        if (!node || Date.now() - retryFocusAt > 10_000) return;
        const active = document.activeElement;
        if (active && active !== document.body) return;
        retryFocusAt = 0;
        node.focus();
      }}
      type="button"
      onClick={(event) => {
        if (pending) return;
        if (document.activeElement === event.currentTarget) retryFocusAt = Date.now();
        startTransition(() => retry());
      }}
      aria-disabled={pending || undefined}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
