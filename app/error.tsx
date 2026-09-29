"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Next 16.3+: refreshes server data, then re-renders (reset only re-renders). */
  retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex justify-center px-4 py-16 text-white">
      <section
        aria-labelledby="error-title"
        className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-6 text-center sm:p-8"
      >
        <p aria-hidden="true" className="whitespace-nowrap text-3xl sm:text-4xl">
          (╯°□°)╯︵ ┻━┻
        </p>
        <h1 id="error-title" className="text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="text-[rgb(164,164,164)]">
          This page hit an unexpected error. It might be a hiccup on our side
          or with the anime data source — try again in a moment.
        </p>
        {error.digest && (
          <p className="text-xs text-[rgb(164,164,164)]">
            Error ID: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => (retry ?? reset)()}
            className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(38,38,38)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-5 py-3 font-medium text-white transition-colors hover:bg-[rgb(53,53,53)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
          >
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
