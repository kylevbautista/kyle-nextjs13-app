"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  dedupeByMalId,
  getTopAnimeJinkan,
  type TopAnimeItem,
  type TopAnimePage,
} from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";
import { searchPath } from "@/lib/routes";

const EAGER_POSTERS = 3;

const malUrl = (malId: number) => `https://myanimelist.net/anime/${malId}`;

/** 1_234_567 → "1.2M". Hand-rolled so server and browser output always match. */
const compactNumber = (n: number) => {
  const oneDecimal = (value: number) => value.toFixed(1).replace(/\.0$/, "");
  if (n >= 999_950) return `${oneDecimal(n / 1_000_000)}M`;
  if (n >= 1_000) return `${oneDecimal(n / 1_000)}K`;
  return String(n);
};

const detailsLine = (anime: TopAnimeItem) =>
  [
    anime.type,
    anime.episodes !== null
      ? `${anime.episodes} ${anime.episodes === 1 ? "ep" : "eps"}`
      : null,
    anime.year !== null ? String(anime.year) : null,
  ]
    .filter(Boolean)
    .join(" · ");

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2";

function StarIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-[1em] w-[1em] shrink-0 text-yellow-400"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function TopAnimeRow({ anime, eager }: { anime: TopAnimeItem; eager: boolean }) {
  const name = anime.titleEnglish ?? anime.title;
  const href = malUrl(anime.malId);
  const details = detailsLine(anime);
  const showDefaultTitle =
    anime.titleEnglish !== null && anime.titleEnglish !== anime.title;

  return (
    <li className="flex animate-grow items-center gap-3 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-2 motion-reduce:animate-none sm:gap-4 sm:p-3 laptop2:p-4">
      <div className="min-w-[2.75rem] shrink-0 text-center text-xl font-bold tabular-nums text-[#95ccff] sm:min-w-[4rem] sm:text-3xl laptop2:min-w-[6rem] laptop2:text-5xl">
        {anime.rank !== null ? (
          <>
            <span className="sr-only">Rank </span>
            {anime.rank}
          </>
        ) : (
          <>
            <span className="sr-only">Unranked</span>
            <span aria-hidden="true">–</span>
          </>
        )}
      </div>

      {/* Same destination as the title link, so it's hidden from the tab order and screen readers. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className="relative aspect-[225/318] w-16 shrink-0 overflow-hidden rounded-lg border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] sm:w-20 laptop2:w-24"
      >
        {anime.imageUrl ? (
          <Image
            src={anime.imageUrl}
            alt={`${name} poster`}
            fill
            sizes="(min-width: 1028px) 96px, (min-width: 640px) 80px, 64px"
            preload={eager}
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[rgb(164,164,164)]">
            No image
          </span>
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold leading-snug sm:text-lg laptop2:text-xl">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded hover:text-[#95ccff] hover:underline focus-visible:ring-offset-[rgb(30,30,30)] ${focusRing}`}
            >
              {name}
              <span className="sr-only"> (opens MyAnimeList in a new tab)</span>
            </a>
          </h2>
          {showDefaultTitle && (
            <p className="line-clamp-2 break-words text-xs text-[rgb(164,164,164)] sm:text-sm">
              {anime.title}
            </p>
          )}
          {details && (
            <p className="mt-1 text-xs text-[rgb(164,164,164)] sm:text-sm">{details}</p>
          )}
          {anime.members !== null && (
            <p className="text-xs text-[rgb(164,164,164)]">
              {compactNumber(anime.members)} members
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <p className="flex items-center gap-1 font-bold tabular-nums sm:text-xl laptop2:text-2xl">
            <StarIcon />
            <span className="sr-only">Score </span>
            {anime.score !== null ? anime.score.toFixed(2) : "N/A"}
          </p>
          {/* MAL ids can't be added to the list directly; the AniList search finds the same show. */}
          <Link
            href={searchPath(anime.title)}
            prefetch={false}
            className={`rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:ring-offset-[rgb(30,30,30)] ${focusRing}`}
          >
            Track
            <span className="sr-only"> {name}: find it on AniList to add to your list</span>
          </Link>
        </div>
      </div>
    </li>
  );
}

export default function TopAnimeList({ initialPage }: { initialPage: TopAnimePage }) {
  const [items, setItems] = useState(initialPage.items);
  const [hasNextPage, setHasNextPage] = useState(initialPage.hasNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPageRef = useRef(initialPage.currentPage);
  const inFlightRef = useRef(false);
  const errorId = useId();

  const loadMore = async () => {
    // Guards double clicks (and clicks while aria-disabled) from loading one page twice.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const nextPage = lastPageRef.current + 1;
      const result = await getTopAnimeJinkan({ page: nextPage, isClient: true });
      if (result.ok) {
        lastPageRef.current = nextPage;
        setItems((prev) => dedupeByMalId(prev, result.page.items));
        setHasNextPage(result.page.hasNextPage);
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  return (
    <div className="w-full">
      <ol aria-label="Top anime ranking" className="flex flex-col gap-3">
        {items.map((anime, index) => (
          <TopAnimeRow key={anime.malId} anime={anime} eager={index < EAGER_POSTERS} />
        ))}
      </ol>

      <p role="status" className="sr-only">
        {loading ? "Loading more anime…" : `Showing ${items.length} anime`}
      </p>

      {hasNextPage ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          {error && (
            <p
              id={errorId}
              role="alert"
              className="max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-center text-sm text-red-200"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={loadMore}
            aria-disabled={loading}
            aria-describedby={error ? errorId : undefined}
            className={`inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-500 focus-visible:ring-offset-[rgb(18,18,18)] aria-disabled:cursor-wait aria-disabled:opacity-70 ${focusRing}`}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {loading ? "Loading…" : error ? "Retry" : "Show more"}
          </button>
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-[rgb(164,164,164)]">
          That&apos;s the whole ranking. Impressive scrolling!
        </p>
      )}
    </div>
  );
}
