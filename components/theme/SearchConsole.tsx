"use client";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, type FormEvent, type ReactNode } from "react";
import { rememberSearchFocus, rememberSearchKey, repeatSearchArrival } from "@/components/utils/searchArrival";
import {
  SEARCH_EXAMPLES,
  SEARCH_FORM_NAME,
  SEARCH_INPUT_LABEL,
  SEARCH_PLACEHOLDER,
  SEARCH_SUBMIT,
} from "@/lib/anime/searchConsoleCopy";
import { searchPath } from "@/lib/routes";
import { MAX_QUERY_LENGTH, normalizeQuery } from "@/lib/search";
import { FOCUS_RING_CONSOLE, LABEL_CLASS } from "./tokens";

// w-full + size={1}: a percentage width makes the input's min-content contribution 0
// (its default size=20 width used to widen /search past 320px: CLAUDE.md §9.13).
// [color-scheme:dark] keeps the native clear button dark.
const INPUT =
  "w-full min-w-0 rounded-xl border border-[rgb(53,53,53)] bg-[rgb(18,18,18)] font-mono text-base text-white [color-scheme:dark] placeholder:text-[rgb(130,140,160)] focus:border-[#95ccff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]/40";
// border-transparent: an edge in forced-colors mode.
const BUTTON = `inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent bg-blue-600 font-semibold text-white transition-colors hover:bg-blue-500 ${FOCUS_RING_CONSOLE}`;

const SIZES = {
  // The landing demo's layout: stacked on phones, one row from 640px.
  // flex-1 only in the row (in the column it would replace h-14 with a content basis).
  large: { row: "flex flex-col gap-3 sm:flex-row", input: "h-14 px-4 sm:flex-1", button: "h-14 px-6", word: "" },
  // The owner's compact box above results (/search's results box, with the filter toggle in the
  // row): one row at every width; Analyze is icon-only below 375px, so the field keeps ≥ 140px.
  compact: {
    row: "flex gap-2 sm:gap-3",
    input: "h-12 flex-1 px-3 sm:px-4",
    button: "h-12 w-12 min-[375px]:w-auto min-[375px]:px-4 sm:px-5",
    word: "max-[374px]:hidden",
  },
} as const;

export interface SearchConsoleProps {
  size: "large" | "compact";
  defaultValue?: string;
  /** The /search home only (its sole purpose is searching). */
  autoFocus?: boolean;
  /** The owner's visible field label (the /search home); sr-only otherwise. */
  showLabel?: boolean;
  /** Landing analytics. Never preventDefault. */
  onSubmit?: () => void;
  className?: string;
  /*
   * /search's results box only (app/search/FilteredSearchConsole.tsx). The home
   * and the landing pass none of these, so their markup stays identical (rule 1).
   */
  /** A control after Analyze, in the row (the filter toggle). */
  toggle?: ReactNode;
  /** Inside the form, after the row (the filter panel). */
  children?: ReactNode;
  /**
   * The URL to open, built from the submitted form (canonical: next/form would
   * append every select, empty ones too). It must be a searchKey
   * (lib/search.ts): it is also the arrival token. With it, submitting is
   * preventDefault + router.push.
   */
  hrefFor?: (data: FormData) => string;
}

/**
 * The Great Sage search console: GET /search?q=… (a plain form without JS;
 * next/form makes it a client navigation). The landing's chapter and /search
 * render this same component (skill rule 1). Submitting leaves the arrival
 * token, so /search focuses its results heading when they arrive. /search's
 * results box adds its filter toggle, panel and canonical URL through
 * `toggle`, `children` and `hrefFor` (app/search/FilteredSearchConsole.tsx).
 */
export function SearchConsole({
  size,
  defaultValue = "",
  autoFocus = false,
  showLabel = false,
  onSubmit,
  className = "",
  toggle,
  children,
  hrefFor,
}: SearchConsoleProps) {
  const inputId = useId();
  const router = useRouter();
  const s = SIZES[size];
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    if (!hrefFor) {
      const query = normalizeQuery(String(data.get("q") ?? ""));
      // The same search again (same URL): nothing arrives, so say the outcome again now.
      if (!rememberSearchFocus("title", query, 1)) repeatSearchArrival();
      onSubmit?.();
      return; // next/form navigates
    }
    // next/form returns when the caller prevented the default.
    event.preventDefault();
    const href = hrefFor(data);
    if (!rememberSearchKey("title", href)) repeatSearchArrival();
    onSubmit?.();
    router.push(href);
  };
  return (
    <Form
      action="/search"
      // Never prefetch: a prefetch of bare /search hands its head ("Search anime") to later
      // /search?q= navigations (wrong document title, read out by Next's route announcer).
      prefetch={false}
      role="search"
      aria-label={SEARCH_FORM_NAME}
      onSubmit={handleSubmit}
      className={`min-w-0 ${className}`}
    >
      <label htmlFor={inputId} className={showLabel ? `mb-2 block ${LABEL_CLASS}` : "sr-only"}>
        {SEARCH_INPUT_LABEL}
      </label>
      <div className={s.row}>
        <input
          id={inputId}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={SEARCH_PLACEHOLDER}
          required
          maxLength={MAX_QUERY_LENGTH}
          size={1}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          // Only on the /search home, whose sole purpose is searching; the label sits right above.
          autoFocus={autoFocus}
          className={`${INPUT} ${s.input}`}
        />
        <button type="submit" aria-label={SEARCH_SUBMIT.name} className={`${BUTTON} ${s.button}`}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4.5 4.5" strokeLinecap="round" />
          </svg>
          <span className={s.word}>{SEARCH_SUBMIT.text}</span>
        </button>
        {toggle}
      </div>
      {children}
    </Form>
  );
}

/** "Try:" + the example chips (44px hit area via ::after). Never prefetched: each is an AniList request. */
export function SearchChips({ onChip, className = "mt-5" }: { onChip?: (chip: string) => void; className?: string }) {
  return (
    // From 360px "Try:" keeps the first chip row and the list wraps beside it (a label column),
    // never under it; below that it sits above a full-width list.
    <div className={`flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-start ${className}`}>
      <span
        aria-hidden="true"
        className="shrink-0 font-mono text-xs leading-4 text-[rgb(164,164,164)] min-[360px]:pt-2"
      >
        Try:
      </span>
      <ul aria-label="Example searches" className="flex min-w-0 flex-wrap gap-x-2 gap-y-3 min-[360px]:flex-1">
        {SEARCH_EXAMPLES.map((chip) => (
          <li key={chip}>
            <Link
              href={searchPath(chip)}
              prefetch={false}
              onClick={() => onChip?.(chip)}
              onNavigate={() => rememberSearchFocus("title", chip, 1)}
              className={`relative inline-flex items-center rounded-full border border-[#95ccff]/30 px-3 py-1.5 text-sm text-[#cfe8ff] transition-colors after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] hover:bg-[#95ccff]/10 ${FOCUS_RING_CONSOLE}`}
            >
              {chip}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
