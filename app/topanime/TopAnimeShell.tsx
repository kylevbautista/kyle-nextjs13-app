import type { ReactNode } from "react";

/** Page chrome shared by page.tsx, loading.tsx and error.tsx so the header never jumps. */
export default function TopAnimeShell({ children }: { children: ReactNode }) {
  return (
    <main
      id="top-anime"
      className="mx-auto flex w-full max-w-5xl flex-col px-4 py-4 text-white sm:py-6"
    >
      <header className="mb-4 text-center sm:mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Top Anime</h1>
        <p className="mt-1 text-sm text-[rgb(164,164,164)] sm:text-base">
          MyAnimeList&apos;s highest-rated anime (via Jikan)
        </p>
      </header>
      {children}
    </main>
  );
}
