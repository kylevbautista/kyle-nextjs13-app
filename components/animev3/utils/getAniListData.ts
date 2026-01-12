import { allCurrAnimeTag } from "../../utils/anilist-queries/allCurrAnimeTag";
import { fetchWithTimeout } from "./fetchWithTimeout";

/**
 * Pauses execution for a specified duration
 * @param ms - Time to sleep in milliseconds
 * @returns Promise that resolves after the specified delay
 */
const sleep = (ms: number) => {
  return new Promise((r) => setTimeout(r, ms));
};

/**
 * Fetches anime data from the AniList GraphQL API for a specific year and season
 * Implements rate limiting protection by monitoring remaining API calls
 *
 * @param options - Configuration object for the API request
 * @param options.page - Page number for pagination (default: 1)
 * @param options.year - The year to fetch anime data for
 * @param options.season - Season name (WINTER, SPRING, SUMMER, FALL)
 * @param options.timeout - Request timeout in milliseconds (default: 5000)
 * @param options.enableLogs - Enable console logging for debugging (default: false)
 * @returns Promise resolving to anime data from AniList, or empty object on error
 *
 * @example
 * const data = await getAniListData({
 *   page: 1,
 *   year: 2024,
 *   season: 'winter',
 *   timeout: 5000,
 *   enableLogs: true
 * });
 */
export const getAniListData = async ({
  page = 1,
  year,
  season = "",
  timeout = 5000,
  enableLogs = false,
}: any) => {
  // Use server-side or client-side environment variable based on availability
  const url = process.env.GRAPHQL_ANILIST
    ? process.env.GRAPHQL_ANILIST
    : process.env.NEXT_PUBLIC_GRAPHQL_ANILIST;
  const parsedYear = parseInt(year);

  try {
    // Send GraphQL query to AniList API
    const res = await fetchWithTimeout(`${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: allCurrAnimeTag,
        variables: {
          page: page,
          year: parsedYear,
          season: season.toUpperCase(), // AniList expects uppercase season names
        },
      }),
      timeout: timeout,
    });

    // Log rate limit information if debugging is enabled
    if (enableLogs)
      console.log(
        `getDataByYear ${parsedYear} ${season}`,
        res.headers.get("x-ratelimit-remaining")
      );

    // Return empty object if request failed
    if (res.status !== 200) {
      return {};
    }

    // Check rate limit and throttle if approaching limit
    const limitRemaining = Number(res.headers.get("x-ratelimit-remaining"));
    if (limitRemaining < 20) {
      // Sleep for 1.5 seconds to avoid hitting rate limit
      await sleep(1500);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};
