"use client";

import { useEffect, useTransition } from "react";
import TopAnimeShell from "./TopAnimeShell";

export default function TopAnimeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // Next 16's retry() re-fetches the server render; reset() would only re-render the failed payload.
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <TopAnimeShell>
      <div
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-6 text-center"
      >
        <p className="text-lg font-semibold">The ranking wandered off.</p>
        <p className="text-sm text-[rgb(164,164,164)]">
          We couldn&apos;t reach MyAnimeList (via Jikan). It may be busy or briefly
          down. Give it a few seconds and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!pending) startTransition(() => retry());
          }}
          aria-disabled={pending}
          className="mt-1 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(38,38,38)] aria-disabled:cursor-wait aria-disabled:opacity-70"
        >
          {pending ? "Retrying…" : "Retry"}
        </button>
      </div>
    </TopAnimeShell>
  );
}
