"use client";
import { Suspense, useId, useRef, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { searchPath } from "@/lib/routes";

const MAX_QUERY_LENGTH = 100;

/**
 * Plain GET form (works before hydration / without JS); with JS it navigates
 * client-side. On phones it is an icon-sized field that expands while focused.
 */
function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "")
      .trim()
      .slice(0, MAX_QUERY_LENGTH);
    inputRef.current?.blur();
    router.push(searchPath(query));
  };

  return (
    <form
      role="search"
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className="relative h-10 w-10 shrink-0 sm:w-48 lg:w-64"
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
        // Phones: 16px text (smaller makes iOS zoom on focus); the expanded field
        // stops short of the nav's left edge and keeps text clear of the icon,
        // which stays at its right end.
        className="
          absolute right-0 top-0 z-10 h-10 w-10 rounded-full
          border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] pl-9 pr-3 text-base
          text-transparent placeholder:text-transparent
          transition-[width] duration-200
          hover:border-blue-500
          focus:w-[calc(100vw-4.5rem)] focus:pr-10 focus:text-white focus:placeholder:text-[rgb(164,164,164)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]
          sm:static sm:w-full sm:text-sm sm:text-white sm:placeholder:text-[rgb(164,164,164)] sm:focus:w-full sm:focus:pr-3
          [&::-webkit-search-cancel-button]:hidden
        "
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute left-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-[rgb(164,164,164)]"
      >
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
  const query = pathname === "/search" ? (searchParams.get("q") ?? "") : "";
  return <SearchForm initialQuery={query.slice(0, MAX_QUERY_LENGTH)} />;
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
