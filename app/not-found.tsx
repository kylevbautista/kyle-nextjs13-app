import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

const buttonBase =
  "rounded-xl px-5 py-3 font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(38,38,38)]";

export default function NotFound() {
  return (
    <main className="flex justify-center px-4 py-16 text-white">
      <section
        aria-labelledby="not-found-title"
        className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-6 text-center sm:p-8"
      >
        <p className="text-6xl font-bold text-[#95ccff]">404</p>
        <h1 id="not-found-title" className="text-2xl font-bold">
          This page got isekai&apos;d
        </h1>
        <p className="text-[rgb(164,164,164)]">
          We couldn&apos;t find what you were looking for. Maybe it&apos;s
          airing next season?
        </p>
        <nav
          aria-label="Suggested pages"
          className="flex flex-wrap justify-center gap-3"
        >
          <Link href="/anime" className={`${buttonBase} bg-blue-600 hover:bg-blue-500`}>
            This season
          </Link>
          <Link
            href="/search"
            // Never prefetch bare /search (its "Search anime" <title> leaks into later
            // /search?q= navigations: Next 16.3, app/search/SearchTitle.tsx).
            prefetch={false}
            className={`${buttonBase} border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] hover:bg-[rgb(53,53,53)]`}
          >
            Search
          </Link>
          <Link
            href="/"
            className={`${buttonBase} border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] hover:bg-[rgb(53,53,53)]`}
          >
            Home
          </Link>
        </nav>
      </section>
    </main>
  );
}
