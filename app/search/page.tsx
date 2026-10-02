import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import type { AnimeMedia } from "@/lib/anime/types";
import { searchPath } from "@/lib/routes";
import { AniListError, SEARCH_PAGE_SIZE, searchAnime } from "@/server/lib/anilist";
import SearchForm from "./SearchForm";
import SearchResults from "./SearchResults";
import {
  MAX_PAGE,
  type SearchPageParams,
  normalizePage,
  normalizeQuery,
  searchResultsPath,
} from "./searchParams";

interface SearchPageProps {
  searchParams: SearchPageParams;
}

const CURRENT_SEASON_PATH = "/anime";
const EXAMPLE_SEARCHES = ["Sousou no Frieren", "Cowboy Bebop", "Kimi no Na wa", "Mushishi"];

const linkClass =
  "rounded text-[#95ccff] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";
const buttonLinkClass =
  "inline-flex items-center gap-1 rounded-md border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-500 hover:bg-[rgb(48,48,48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = normalizeQuery((await searchParams).q);
  if (!query) {
    return {
      title: "Search anime",
      description:
        "Search every anime on AniList (older seasons, movies, ONAs) and add it to your list.",
    };
  }
  return {
    title: `Search: ${query}`,
    description: `Anime matching “${query}”.`,
    robots: { index: false, follow: true },
  };
}

type SearchOutcome =
  | { ok: true; media: AnimeMedia[]; total: number; hasNextPage: boolean }
  | { ok: false; rateLimited: boolean };

async function runSearch(query: string, page: number): Promise<SearchOutcome> {
  try {
    const { media, total, hasNextPage } = await searchAnime(query, page);
    return { ok: true, media, total, hasNextPage };
  } catch (err) {
    unstable_rethrow(err);
    console.error(`[search] "${query}" page ${page} failed:`, err);
    return { ok: false, rateLimited: err instanceof AniListError && err.status === 429 };
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const page = normalizePage(params.page);

  if (!query) return <SearchLanding />;

  const outcome = await runSearch(query, page);

  return (
    <main className="flex w-full flex-col items-center px-4 py-6 text-white sm:p-4">
      <div className="mb-6 w-full max-w-3xl">
        <SearchForm key={query} defaultValue={query} />
      </div>

      <div className="mb-4 flex w-full max-w-7xl flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 id="search-results-title" tabIndex={-1} className="text-xl font-bold focus:outline-none sm:text-2xl">
          Results for <span className="break-words text-[#95ccff]">“{query}”</span>
        </h1>
        {outcome.ok && outcome.total > 0 && (
          <ResultCount page={page} shown={outcome.media.length} total={outcome.total} />
        )}
      </div>

      {!outcome.ok ? (
        <SearchError query={query} page={page} rateLimited={outcome.rateLimited} />
      ) : outcome.media.length === 0 ? (
        page > 1 ? (
          <PastLastPage query={query} page={page} />
        ) : (
          <NoResults query={query} />
        )
      ) : (
        <>
          <SearchResults media={outcome.media} />
          <Pagination query={query} page={page} hasNextPage={outcome.hasNextPage} />
        </>
      )}
    </main>
  );
}

function SearchLanding() {
  return (
    <main className="flex w-full flex-col items-center px-4 py-10 text-white sm:py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Search anime</h1>
        <p className="mt-3 text-[rgb(164,164,164)]">
          Find any anime — older seasons, movies, ONAs — and add it to your list.
        </p>
        <div className="mt-8">
          <SearchForm size="large" />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-[rgb(164,164,164)]">Try:</span>
          {EXAMPLE_SEARCHES.map((example) => (
            <Link
              prefetch={false}
              key={example}
              href={searchPath(example)}
              className="rounded-full border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] px-3 py-1 text-[#95ccff] transition-colors hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
            >
              {example}
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm text-[rgb(164,164,164)]">
          Just want what&apos;s airing?{" "}
          <Link href={CURRENT_SEASON_PATH} className={linkClass}>
            Browse this season
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function ResultCount({ page, shown, total }: { page: number; shown: number; total: number }) {
  const from = (page - 1) * SEARCH_PAGE_SIZE + 1;
  const to = from + shown - 1;
  return (
    <p className="text-sm text-[rgb(164,164,164)]">
      {total.toLocaleString("en-US")} {total === 1 ? "match" : "matches"}
      {shown > 0 && total > shown && (
        <>
          {" "}
          · showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")}
        </>
      )}
    </p>
  );
}

function Pagination({
  query,
  page,
  hasNextPage,
}: {
  query: string;
  page: number;
  hasNextPage: boolean;
}) {
  const hasPrevious = page > 1;
  const hasNext = hasNextPage && page < MAX_PAGE;
  if (!hasPrevious && !hasNext) return null;

  return (
    <nav
      aria-label="Search result pages"
      className="mt-8 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4"
    >
      <div className="flex justify-end">
        {hasPrevious && (
          <Link
            prefetch={false}
            href={searchResultsPath(query, page - 1)}
            aria-label={`Previous page (page ${page - 1})`}
            className={buttonLinkClass}
          >
            <span aria-hidden="true">←</span> Previous
          </Link>
        )}
      </div>
      <span className="text-sm text-[rgb(164,164,164)]">Page {page}</span>
      <div className="flex justify-start">
        {hasNext && (
          <Link
            prefetch={false}
            href={searchResultsPath(query, page + 1)}
            aria-label={`Next page (page ${page + 1})`}
            className={buttonLinkClass}
          >
            Next <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

function MessagePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-xl rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-6 text-center shadow-md">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-[rgb(164,164,164)]">{children}</div>
    </section>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <MessagePanel title={`No anime found for “${query}”`}>
      <p>AniList came back empty-handed. A few things to try:</p>
      <ul className="mx-auto mt-3 max-w-sm list-disc space-y-1 pl-5 text-left">
        <li>Check the spelling.</li>
        <li>
          Try the romaji title, e.g. <span className="text-white">Shingeki no Kyojin</span> for
          Attack on Titan.
        </li>
        <li>Use fewer or shorter words.</li>
      </ul>
      <p className="mt-5">
        Or{" "}
        <Link href={CURRENT_SEASON_PATH} className={linkClass}>
          browse this season&apos;s anime
        </Link>
        .
      </p>
    </MessagePanel>
  );
}

function PastLastPage({ query, page }: { query: string; page: number }) {
  return (
    <MessagePanel title={`Nothing on page ${page}`}>
      <p>That&apos;s past the last page of results.</p>
      <p className="mt-5">
        <Link prefetch={false} href={searchResultsPath(query)} className={buttonLinkClass}>
          Back to page 1
        </Link>
      </p>
    </MessagePanel>
  );
}

function SearchError({
  query,
  page,
  rateLimited,
}: {
  query: string;
  page: number;
  rateLimited: boolean;
}) {
  return (
    <MessagePanel
      title={rateLimited ? "Whoa, slow down! AniList needs a breather" : "AniList isn't answering"}
    >
      <p>
        {rateLimited
          ? "We've hit AniList's request limit. Give it a few seconds, then try again."
          : "The search couldn't reach AniList just now. It's usually back in a moment."}
      </p>
      <p className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {/* A full request so the retry never reuses a cached failure. */}
        <a href={searchResultsPath(query, page)} className={buttonLinkClass}>
          Try again
        </a>
        <Link href={CURRENT_SEASON_PATH} className={linkClass}>
          Browse this season instead
        </Link>
      </p>
    </MessagePanel>
  );
}
