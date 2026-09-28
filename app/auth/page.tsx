import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../server/auth";
import { airingSchedulePath, myListPath } from "../../lib/routes";
import SignOutButton from "../../components/auth/SignOutButton";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

const listLink =
  "flex flex-col gap-1 rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-4 py-3 text-left transition-colors hover:border-blue-500 hover:bg-[rgb(53,53,53)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const name = session.user?.name?.trim() || "Anime fan";
  const image = session.user?.image;
  const userId = session.objectId;

  return (
    <main className="flex justify-center px-4 py-10 text-white sm:py-16">
      <section
        aria-labelledby="account-title"
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-6 sm:p-8"
      >
        {image ? (
          <Image
            src={image}
            alt={`${name}'s avatar`}
            width={96}
            height={96}
            unoptimized
            referrerPolicy="no-referrer"
            className="h-24 w-24 rounded-full border-2 border-[rgb(53,53,53)] object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold uppercase"
          >
            {name.charAt(0)}
          </div>
        )}
        <div className="text-center">
          <p className="text-sm text-[rgb(164,164,164)]">Signed in as</p>
          <h1 id="account-title" className="break-words text-2xl font-bold">
            {name}
          </h1>
        </div>
        {userId && (
          <nav aria-label="Your lists" className="flex w-full flex-col gap-3">
            <Link href={myListPath(userId)} className={listLink}>
              <span className="font-medium text-[#95ccff]">My List</span>
              <span className="text-sm text-[rgb(164,164,164)]">
                Statuses, episode progress, scores and dates
              </span>
            </Link>
            <Link href={airingSchedulePath(userId)} className={listLink}>
              <span className="font-medium text-[#95ccff]">
                Airing Schedule
              </span>
              <span className="text-sm text-[rgb(164,164,164)]">
                This season&apos;s shows from your list, with countdowns
              </span>
            </Link>
          </nav>
        )}
        <SignOutButton />
      </section>
    </main>
  );
}
