import type { Metadata } from "next";
import { loadListEntries } from "@/server/lib/userList";
import { lookupListOwner, publicOwnerName, requireListOwner } from "@/server/lib/listRoute";
import { myListPath } from "@/lib/routes";
import { MyList } from "../_client/MyList";
import { toMyListEntry } from "../_client/listFilters";

interface UserListPageProps {
  params: Promise<{ user?: string[] }>;
}

export async function generateMetadata({ params }: UserListPageProps): Promise<Metadata> {
  const { user = [] } = await params;
  const lookup = await lookupListOwner(user[0]);
  if (lookup.kind !== "found") return { title: "Anime list" };

  // Metadata is what link previews show, so it never includes the full name.
  const name = publicOwnerName(lookup.user.name);
  const title = name ? `${name}'s anime list` : "Anime list";
  const count = Array.isArray(lookup.user.following) ? lookup.user.following.length : 0;
  const description = `${count} anime tracked on kylevb.com — what's airing, watched and planned.`;
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

export default async function UserListPage({ params }: UserListPageProps) {
  const { user } = await params;
  // Already enforced by layout.tsx (before streaming); cached, so no extra queries.
  const lookup = await requireListOwner(user, myListPath);

  const entries = (await loadListEntries(lookup.user)).map(toMyListEntry);

  return (
    <MyList
      key={lookup.userId}
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
