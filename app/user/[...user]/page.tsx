import type { Metadata } from "next";
import { headers } from "next/headers";
import { listShareCard, shareVersion } from "@/components/og/shareCard";
import { isPreviewBot } from "@/lib/previewBots";
import { listShareImagePath, myListPath } from "@/lib/routes";
import { loadListEntries, readEntriesCached } from "@/server/lib/userList";
import { lookupListOwner, publicOwnerName, requireListOwner } from "@/server/lib/listRoute";
import { MyList } from "../_client/MyList";
import { toMyListEntry } from "../_client/listFilters";

interface UserListPageProps {
  params: Promise<{ user?: string[] }>;
}

export async function generateMetadata({ params }: UserListPageProps): Promise<Metadata> {
  const { user = [] } = await params;
  const lookup = await lookupListOwner(user[0]);
  // An unknown list renders the 404 (requireListOwner): say so in the title too.
  if (lookup.kind === "not-found") return { title: "Page not found" };
  if (lookup.kind !== "found") return { title: "Anime list" };

  // Metadata is what link previews show, so it never includes the full name.
  const name = publicOwnerName(lookup.user.name);
  const title = name ? `${name}'s anime list` : "Anime list";
  // Stored entries (no AniList refresh, no second lookup), normalized once per request: the page's
  // loadListEntries reuses this result. The image route reads the same fields (CARD_PROJECTION).
  const entries = readEntriesCached(lookup.user);
  const description = `${entries.length} anime tracked on kylevb.com — what's airing, watched and planned.`;
  const card = listShareCard(entries, name ?? "Anonymous");
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "kylevb",
      url: myListPath(lookup.userId),
      title,
      description,
      images: [
        {
          url: listShareImagePath(lookup.userId, shareVersion(card)),
          width: 1200,
          height: 630,
          type: "image/png",
          alt: card.alt,
        },
      ],
    },
  };
}

export default async function UserListPage({ params }: UserListPageProps) {
  const { user } = await params;
  // Already enforced by layout.tsx (before streaming); cached, so no extra queries.
  const lookup = await requireListOwner(user, myListPath);

  // A link-preview bot reads the page for its tags only: it gets the stored snapshot and starts no
  // AniList refresh (CLAUDE.md §5.5, §5.8). The page is already dynamic, so reading headers costs nothing.
  const refresh = !isPreviewBot((await headers()).get("user-agent"));
  const entries = (await loadListEntries(lookup.user, { refresh })).map(toMyListEntry);
  // The reference time for "N new" in the banner, sort and chips (a dynamic page:
  // per request; server component, so not Date.now(), see app/anime/layout.tsx).
  const renderedAt = new Date().getTime();

  return (
    <MyList
      key={lookup.userId}
      renderedAt={renderedAt}
      entries={entries}
      isOwner={lookup.isOwner}
      owner={{
        id: lookup.userId,
        // Visitors see the first name only (and nobody sees a profile photo here).
        name: lookup.isOwner ? (lookup.user.name ?? null) : publicOwnerName(lookup.user.name),
      }}
    />
  );
}
