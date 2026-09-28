/** URL builders shared by server and client code. */

/** The full tracker: statuses, progress, score, dates. */
export const myListPath = (userId: string) => `/user/${userId}`;

/** This season's shows from a user's list, by weekday, with countdowns. */
export const airingSchedulePath = (userId: string) => `/mylist/${userId}`;

export const searchPath = (query?: string) =>
  query ? `/search?q=${encodeURIComponent(query)}` : "/search";

export const signInPath = (callbackUrl?: string) =>
  callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin";
