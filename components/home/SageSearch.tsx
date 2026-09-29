"use client";
import { useId } from "react";
import Link from "next/link";
import { searchPath } from "@/lib/routes";
import { trackLanding } from "./analytics";
import { CHAPTER_SUB_CLASS, CHAPTER_TITLE_CLASS, EYEBROW_CLASS, SageLine } from "./SageLine";

const CHIPS = ["Tensei Shitara Slime", "Frieren", "Dandadan", "One Piece"];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1528]";

/**
 * Chapter 4 · Great Sage: a native GET search form (works without JS), example
 * chips and the Top Anime doorway. Nothing here prefetches: every search page
 * costs an AniList request.
 */
export default function SageSearch() {
  const inputId = useId();
  return (
    <section
      id="sage-search"
      aria-labelledby="sage-search-title"
      className="relative isolate mx-auto max-w-3xl scroll-mt-20 px-4 py-20 [contain:inline-size] sm:py-28"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#95ccff]/30 bg-[#0a1528]/80 p-5 shadow-[inset_0_0_60px_-20px_rgba(149,204,255,.35),0_30px_80px_-40px_rgba(93,174,241,.45)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.04)_0_1px,transparent_1px_3px)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-[#95ccff]/60" />
          <span className="absolute right-3 top-3 h-3 w-3 border-r-2 border-t-2 border-[#95ccff]/60" />
          <span className="absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-[#95ccff]/60" />
          <span className="absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-[#95ccff]/60" />
        </div>

        <div className="relative">
          <div data-reveal="">
            <p className={EYEBROW_CLASS}>Skill 04 · Great Sage</p>
            <SageLine kind="Question" scan="reveal" className="mt-4">
              What anime are you looking for?
            </SageLine>
            <h2 id="sage-search-title" className={`mt-5 ${CHAPTER_TITLE_CLASS}`}>
              Ask the Great Sage.
            </h2>
            <p className={`mt-4 ${CHAPTER_SUB_CLASS}`}>
              Search all of AniList: older seasons, movies, ONAs, and that one show you half-remember
              from 2009.
            </p>
          </div>

          <form
            role="search"
            aria-label="Search anime"
            action="/search"
            method="get"
            onSubmit={() => trackLanding("search_submit", { location: "sage_search" })}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor={inputId} className="sr-only">
              Anime title
            </label>
            <input
              id={inputId}
              type="search"
              name="q"
              maxLength={100}
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Try “Frieren” or “Tensura”"
              className="h-14 w-full min-w-0 rounded-xl sm:w-auto sm:flex-1 border border-[rgb(53,53,53)] bg-[rgb(18,18,18)] px-4 font-mono text-base text-white placeholder:text-[rgb(130,140,160)] focus:border-[#95ccff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]/40"
            />
            <button
              type="submit"
              aria-label="Analyze: search AniList"
              className={`inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition-colors hover:bg-blue-500 ${FOCUS}`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M13 13l4.5 4.5" strokeLinecap="round" />
              </svg>
              Analyze
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
            <span aria-hidden="true" className="font-mono text-xs text-[rgb(164,164,164)]">
              Try:
            </span>
            <ul aria-label="Example searches" className="flex flex-wrap gap-x-2 gap-y-3">
              {CHIPS.map((chip) => (
                <li key={chip}>
                  <Link
                    href={searchPath(chip)}
                    prefetch={false}
                    onClick={() => trackLanding("search_chip", { chip })}
                    className={`relative inline-flex items-center rounded-full border border-[#95ccff]/30 px-3 py-1.5 text-sm text-[#cfe8ff] transition-colors after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] hover:bg-[#95ccff]/10 ${FOCUS}`}
                  >
                    {chip}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div aria-hidden="true" className="my-7 h-px bg-gradient-to-r from-transparent via-[#95ccff]/30 to-transparent" />

          <div className="flex flex-wrap items-center gap-4">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="h-10 w-10 shrink-0" fill="none" stroke="#f5c451" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 8h12v6a6 6 0 0 1-12 0z" />
              <path d="M14 10H10.5a3.5 3.5 0 0 0 3.8 5M26 10h3.5a3.5 3.5 0 0 1-3.8 5" />
              <path d="M20 20v5M15.5 29h9M17 25h6l.8 4h-7.6z" />
              <path d="M8.5 32c-3-3.5-4-8.5-2.5-13M31.5 32c3-3.5 4-8.5 2.5-13" />
              <path d="M6 27.5c1.8.2 3.2 1.2 3.9 2.8M5.3 22.5c1.8.5 3 1.7 3.4 3.4M34 27.5c-1.8.2-3.2 1.2-3.9 2.8M34.7 22.5c-1.8.5-3 1.7-3.4 3.4" />
            </svg>
            <div className="min-w-0 flex-1 basis-56">
              <p className="font-mono text-xs text-[#95ccff]">
                <span className="sr-only">Great Sage report: </span>
                <span aria-hidden="true">《Report》 </span>
                Looking for the all-time greats?
              </p>
              <p className="mt-1 text-sm leading-6 text-[rgb(200,206,218)]">
                <strong className="font-semibold text-white">Top Anime:</strong> MyAnimeList&apos;s
                highest-ranked shows, each with a Track shortcut.
              </p>
            </div>
            <Link
              href="/topanime"
              onClick={() => trackLanding("cta_click", { cta: "top_anime", location: "sage_search" })}
              className={`inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#95ccff]/40 bg-white/5 px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 max-[399px]:w-full ${FOCUS}`}
            >
              See the rankings <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
