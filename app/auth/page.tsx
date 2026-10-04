import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import SignOutButton from "@/components/auth/SignOutButton";
import NightSky from "@/components/home/NightSky";
import { SageTag } from "@/components/home/SageLine";
import CardPage from "@/components/theme/CardPage";
import LinkPendingGlyph from "@/components/theme/LinkPendingGlyph";
import {
  ACCOUNT_AVATAR,
  ACCOUNT_INITIAL,
  ACCOUNT_PHOTO,
  ACCOUNT_SIGNED_IN_AS,
  CARD_LINK,
  CARD_LINK_TEXT,
  CARD_LINK_TITLE,
  CARD_TITLE_CLASS,
} from "@/components/theme/tokens";
import { airingSchedulePath, myListPath } from "@/lib/routes";
import { authOptions } from "@/server/auth";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  // Before any streaming: no loading.tsx in app/auth (§9.6, §9.15).
  if (!session) redirect("/auth/signin");

  const name = session.user?.name?.trim() || "Anime fan";
  const image = session.user?.image;
  const userId = session.objectId;
  // A code point, not charAt(0): a name that starts with an emoji isn't half a surrogate pair.
  const initial = Array.from(name)[0];

  return (
    <CardPage titleId="account-title" size="sm" sky={<NightSky variant="page" forest={false} />}>
      <div className={ACCOUNT_AVATAR}>
        <span aria-hidden="true" className={ACCOUNT_INITIAL}>
          {initial}
        </span>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars come from arbitrary hosts and need referrerPolicy; alt="": the h1 names you, and a broken photo must paint nothing over the initial
          <img
            src={image}
            alt=""
            width={96}
            height={96}
            referrerPolicy="no-referrer"
            decoding="async"
            className={ACCOUNT_PHOTO}
          />
        )}
      </div>
      <div className="flex max-w-full flex-col items-center gap-1">
        <p className={ACCOUNT_SIGNED_IN_AS}>
          <SageTag kind="Notice" />
          Signed in as
        </p>
        <h1 id="account-title" className={CARD_TITLE_CLASS}>
          {name}
        </h1>
      </div>
      {userId && (
        <nav aria-label="Your lists" className="flex w-full flex-col gap-3">
          <Link href={myListPath(userId)} className={CARD_LINK}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={CARD_LINK_TITLE}>My List</span>
              <span className={CARD_LINK_TEXT}>Statuses, episode progress, scores and dates</span>
            </span>
            <LinkPendingGlyph glyph="→" />
          </Link>
          <Link href={airingSchedulePath(userId)} className={CARD_LINK}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={CARD_LINK_TITLE}>Airing Schedule</span>
              <span className={CARD_LINK_TEXT}>Upcoming episodes from your list, with countdowns</span>
            </span>
            <LinkPendingGlyph glyph="→" />
          </Link>
        </nav>
      )}
      <SignOutButton />
    </CardPage>
  );
}
