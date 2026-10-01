import type { Metadata } from "next";
import { loadListEntries, type UserDoc } from "@/server/lib/userList";
import { lookupListOwner, publicOwnerName, requireListOwner } from "@/server/lib/listRoute";
import { airingSchedulePath } from "@/lib/routes";
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
  if (lookup.kind !== "found") return { title: "Airing Schedule" };

  const name = ownerDisplayName(lookup.user);
  const title = `${name}'s airing schedule`;
  const description = `What's airing from ${name}'s anime list, with live episode countdowns.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/rimuru.png", width: 200, height: 141 }],
    },
  };
}

export default async function AiringSchedulePage({ params }: AiringSchedulePageProps) {
  const { user } = await params;
  // Already enforced by layout.tsx (before streaming); cached, so no extra queries.
  const lookup = await requireListOwner(user, airingSchedulePath);

  const entries = await loadListEntries(lookup.user);
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
