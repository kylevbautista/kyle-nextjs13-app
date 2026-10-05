import type { Metadata } from "next";
import { headers } from "next/headers";
import { scheduleShareCard, shareVersion } from "@/components/og/shareCard";
import { isPreviewBot } from "@/lib/previewBots";
import { airingSchedulePath, scheduleShareImagePath } from "@/lib/routes";
import { loadListEntries, readEntriesCached, type UserDoc } from "@/server/lib/userList";
import { lookupListOwner, publicOwnerName, requireListOwner } from "@/server/lib/listRoute";
import AiringSchedule from "@/components/mylist/AiringSchedule";

interface AiringSchedulePageProps {
  params: Promise<{ user?: string[] }>;
}

/** Visitors and link previews get the first name only; the owner sees their full name. */
const ownerDisplayName = (user: Pick<UserDoc, "name">, isOwner = false) =>
  (isOwner ? user.name?.trim() : publicOwnerName(user.name)) || "Anonymous";

export async function generateMetadata({ params }: AiringSchedulePageProps): Promise<Metadata> {
  const { user: segments = [] } = await params;
  const lookup = await lookupListOwner(segments[0] ?? null);
  // An unknown list renders the 404 (requireListOwner): say so in the title too.
  if (lookup.kind === "not-found") return { title: "Page not found" };
  if (lookup.kind !== "found") return { title: "Airing Schedule" };

  const name = ownerDisplayName(lookup.user);
  const title = `${name}'s airing schedule`;
  const description = `What's airing from ${name}'s anime list, with live episode countdowns.`;
  // Stored entries only (no AniList refresh), shared with the page's loadListEntries (readEntriesCached).
  const card = scheduleShareCard(readEntriesCached(lookup.user), name);
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "kylevb",
      url: airingSchedulePath(lookup.userId),
      title,
      description,
      images: [
        {
          url: scheduleShareImagePath(lookup.userId, shareVersion(card)),
          width: 1200,
          height: 630,
          type: "image/png",
          alt: card.alt,
        },
      ],
    },
  };
}

export default async function AiringSchedulePage({ params }: AiringSchedulePageProps) {
  const { user } = await params;
  // Already enforced by layout.tsx (before streaming); cached, so no extra queries.
  const lookup = await requireListOwner(user, airingSchedulePath);

  // A link-preview bot gets the stored snapshot and starts no AniList refresh (CLAUDE.md §5.5, §5.8).
  const refresh = !isPreviewBot((await headers()).get("user-agent"));
  const entries = await loadListEntries(lookup.user, { refresh });
  // "Today" for the first render (a dynamic page, so this is per request).
  const renderedAt = new Date().getTime();

  return (
    <AiringSchedule
      userId={lookup.userId}
      initialEntries={entries}
      isOwner={lookup.isOwner}
      ownerName={ownerDisplayName(lookup.user, lookup.isOwner)}
      renderedAt={renderedAt}
    />
  );
}
