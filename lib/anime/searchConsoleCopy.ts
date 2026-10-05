/**
 * The search console's words, shared by the landing's search chapter
 * (components/home/SageSearch.tsx), the /search home and the results box
 * (components/theme/SearchConsole.tsx). A module of its own, holding nothing
 * else: the landing imports it, and the bundler ships whole modules, so
 * /search's lines and filter copy stay in lib/anime/searchCopy.ts (which
 * re-exports these).
 */

export const SEARCH_EYEBROW = "Skill 04 · Great Sage";
export const SEARCH_QUESTION = "What anime are you looking for?";
export const SEARCH_SUB =
  "Search AniList: older seasons, movies, ONAs, and that one show you half-remember from 2009.";
export const SEARCH_FORM_NAME = "Search anime";
export const SEARCH_INPUT_LABEL = "Anime title (English, romaji or native)";
export const SEARCH_PLACEHOLDER = "Try “Frieren” or “Tensura”";
/** The visible word comes first in the name (label-in-name). */
export const SEARCH_SUBMIT = { text: "Analyze", name: "Analyze: search AniList" } as const;
/**
 * The site's Tensura (the placeholder's nickname; AniList finds the franchise), then the owner's
 * examples: romaji titles, a 1998 show, a movie, a 2005 one. Short enough for one row from 640px.
 */
export const SEARCH_EXAMPLES = [
  "Tensura",
  "Sousou no Frieren",
  "Cowboy Bebop",
  "Kimi no Na wa",
  "Mushishi",
] as const;
