import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { resolveListOwner, type ListOwnerLookup } from "./userList";

/**
 * Route guard for /user/[...user] (My List) and /mylist/[...user] (Airing Schedule).
 *
 * Call requireListOwner() from the segment's layout.tsx: layouts render
 * outside the page's loading.tsx boundary, so redirects and 404s happen before
 * the response starts streaming and get real 307/404 status codes. The page
 * calls it again to get the lookup — React cache() makes that free.
 */

/**
 * How a list owner is named to other people: first name only (lists are public
 * by link and names come from the OAuth profile). Owners see their full name.
 */
export const publicOwnerName = (name: string | null | undefined): string | null =>
  name?.trim().split(/\s+/)[0] || null;

/** ObjectId hex, or a legacy base64url(email) — anything else can't be a list URL. */
const LIST_PARAM_RE = /^[A-Za-z0-9_-]{1,512}$/;

export const lookupListOwner = cache(
  async (param: string | null | undefined): Promise<ListOwnerLookup> => {
    if (!param || !LIST_PARAM_RE.test(param)) return { kind: "not-found" };
    return resolveListOwner(param, await getServerSession(authOptions));
  }
);

export async function requireListOwner(
  segments: string[] | undefined,
  pathFor: (userId: string) => string
) {
  const [param, ...rest] = segments ?? [];
  const lookup = await lookupListOwner(param);
  if (lookup.kind === "redirect") redirect(pathFor(lookup.userId));
  if (lookup.kind === "not-found") notFound();
  // One canonical URL per list: the lower-case id, no extra segments.
  if (param !== lookup.userId || rest.length > 0) redirect(pathFor(lookup.userId));
  return lookup;
}
