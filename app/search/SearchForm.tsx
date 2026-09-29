import Form from "next/form";
import { MAX_QUERY_LENGTH } from "./searchParams";

interface SearchFormProps {
  defaultValue?: string;
  /** "large" is the landing form (visible label, autofocus); "compact" sits above results. */
  size?: "large" | "compact";
}

/**
 * GET /search?q=… — a plain HTML form without JS; next/form turns the submit
 * into a client-side navigation once hydrated.
 */
export default function SearchForm({ defaultValue = "", size = "compact" }: SearchFormProps) {
  const large = size === "large";
  const inputId = "search-page-query";

  return (
    <Form action="/search" role="search" className="w-full">
      <label
        htmlFor={inputId}
        className={
          large ? "mb-2 block text-left text-sm font-medium text-[rgb(164,164,164)]" : "sr-only"
        }
      >
        Anime title (English, romaji or native)
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="e.g. Frieren, Cowboy Bebop, Kimi no Na wa"
          maxLength={MAX_QUERY_LENGTH}
          required
          autoComplete="off"
          enterKeyHint="search"
          // Only on the landing page, whose sole purpose is searching; the label sits directly above.
          autoFocus={large}
          className={`min-w-0 flex-1 rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] text-white placeholder:text-[rgb(120,120,120)] [color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${
            large ? "px-4 py-3 text-lg" : "px-3 py-2"
          }`}
        />
        <button
          type="submit"
          className={`flex shrink-0 items-center gap-2 rounded-md bg-blue-600 font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)] ${
            large ? "px-5 py-3 text-lg" : "px-4 py-2"
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={large ? "h-5 w-5" : "h-4 w-4"}
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.3 9.9l3.15 3.15a.75.75 0 1 0 1.06-1.06l-3.15-3.15A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              clipRule="evenodd"
            />
          </svg>
          Search
        </button>
      </div>
    </Form>
  );
}
