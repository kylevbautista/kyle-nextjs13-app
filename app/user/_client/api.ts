import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { isListStatus } from "@/lib/anime/types";
import type { UserAnimeData } from "@/lib/anime/types";

const isUserAnimeData = (value: unknown): value is UserAnimeData =>
  typeof value === "object" &&
  value !== null &&
  isListStatus((value as UserAnimeData).listType) &&
  typeof (value as UserAnimeData).episodeProgressNumber === "number";

/**
 * PATCH /api/anime-list/<id>/user-data. Resolves with the userData the server
 * saved (after its auto-complete / date rules); throws Error(<server message>).
 */
export async function saveUserData(
  animeId: number,
  userData: Partial<UserAnimeData>
): Promise<UserAnimeData> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`/api/anime-list/${animeId}/user-data`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userData }),
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  const body: { error?: unknown; userData?: unknown } | null = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new Error("Your session has expired. Sign in again to edit your list.");
  }
  if (!res.ok || !isUserAnimeData(body?.userData)) {
    const message = typeof body?.error === "string" && body.error ? body.error : null;
    throw new Error(message ?? `Couldn't save your changes (error ${res.status}).`);
  }
  return body.userData;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error && err.message ? err.message : "Something went wrong, please try again.";
