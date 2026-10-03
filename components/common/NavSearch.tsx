"use client";
import { Suspense, useId, useRef, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NAV_SEARCH_FORM, NAV_SEARCH_ICON, NAV_SEARCH_INPUT } from "@/components/theme/tokens";
import { rememberSearchFocus, repeatSearchArrival } from "@/components/utils/searchArrival";
import { searchPath } from "@/lib/routes";
import { MAX_QUERY_LENGTH, normalizeQuery } from "@/lib/search";

/**
 * Plain GET form (works before hydration / without JS); with JS it navigates
 * client-side. On phones it is an icon-sized field that expands while focused
 * (CSS only; widths in NAV_SEARCH_INPUT / NAV_SESSION_SLOT). Never prefetches.
 */
function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = normalizeQuery(String(new FormData(event.currentTarget).get("q") ?? ""));
    // /search focuses its results heading when they arrive (the input is blurred here).
    const arriving = rememberSearchFocus("title", query, 1);
    inputRef.current?.blur();
    // The search already on screen: nothing arrives, so say the outcome again now.
    if (!arriving) repeatSearchArrival();
    router.push(searchPath(query));
  };

  return (
    // aria-label "Site": the landmark reads "Site search", distinct from /search's own console.
    <form
      role="search"
      aria-label="Site"
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className={NAV_SEARCH_FORM}
    >
      <label htmlFor={inputId} className="sr-only">
        Search anime
      </label>
      <input
        // Remount (and re-prefill) when the URL's query changes.
        key={initialQuery}
        ref={inputRef}
        id={inputId}
        name="q"
        type="search"
        defaultValue={initialQuery}
        placeholder="Search anime…"
        maxLength={MAX_QUERY_LENGTH}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        className={NAV_SEARCH_INPUT}
      />
      {/* After the input: its color follows the input's focus (peer-focus). */}
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={NAV_SEARCH_ICON}>
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>
    </form>
  );
}

function SearchFormWithQuery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = pathname === "/search" ? normalizeQuery(searchParams.get("q")) : "";
  return <SearchForm initialQuery={query} />;
}

export default function NavSearch() {
  // useSearchParams would opt static pages out of prerendering without a
  // Suspense boundary; the fallback is the same form, just not prefilled.
  return (
    <Suspense fallback={<SearchForm initialQuery="" />}>
      <SearchFormWithQuery />
    </Suspense>
  );
}
