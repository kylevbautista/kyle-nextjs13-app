import { searchPath } from "@/lib/routes";

export const MAX_QUERY_LENGTH = 100;
/** Deep pages are rarely useful and each one costs an AniList request. */
export const MAX_PAGE = 50;

type RawParam = string | string[] | undefined;

export type SearchPageParams = Promise<{ q?: RawParam; page?: RawParam }>;

const firstValue = (value: RawParam) => (Array.isArray(value) ? value[0] : value);

/** First `q` value, whitespace-collapsed and trimmed, at most 100 chars; "" when absent. */
export function normalizeQuery(value: RawParam): string {
  const raw = firstValue(value);
  if (typeof raw !== "string") return "";
  // Cut by code point: slicing UTF-16 units can split an emoji into a lone
  // surrogate, which makes encodeURIComponent (searchPath) throw.
  return Array.from(raw.replace(/\s+/g, " ").trim())
    .slice(0, MAX_QUERY_LENGTH)
    .join("")
    .trim();
}

/** First `page` value as an integer in [1, MAX_PAGE]; anything unparseable is page 1. */
export function normalizePage(value: RawParam): number {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.min(MAX_PAGE, Math.max(1, Number(raw)));
}

export const searchResultsPath = (query: string, page = 1) =>
  query && page > 1 ? `${searchPath(query)}&page=${page}` : searchPath(query);
