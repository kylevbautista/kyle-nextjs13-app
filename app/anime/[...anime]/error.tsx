"use client";
import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SeasonError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  const retry = () => {
    // reset() alone re-renders the boundary; refresh() refetches the server component.
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex flex-col items-center px-4 py-16 text-center text-white">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-6 shadow-md">
        <p className="text-4xl" aria-hidden="true">
          (╥﹏╥)
        </p>
        <h2 className="text-xl font-bold">Couldn&apos;t load this season from AniList</h2>
        <p className="text-sm text-[rgb(164,164,164)]">
          AniList might be busy or rate-limiting us. Give it a few seconds and try again.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)]"
          >
            Retry
          </button>
          {/* /anime redirects to the current season at request time. */}
          <Link
            href="/anime"
            className="rounded-full px-3 py-2 text-sm text-[#95ccff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
          >
            Go to the current season
          </Link>
        </div>
      </div>
    </div>
  );
}
