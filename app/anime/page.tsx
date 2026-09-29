import { redirect } from "next/navigation";
import { currentSeasonPath } from "@/lib/season";

// Resolved per request: a build-time redirect would freeze "current season" at deploy time.
export const dynamic = "force-dynamic";

export default function AnimeIndexPage() {
  redirect(currentSeasonPath());
}
