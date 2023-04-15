import { redirect } from "next/navigation";
import { authOptions } from "../../server/auth";
import { getServerSession } from "next-auth/next";
import Link from "next/link";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

export const fetchCache = "default-no-store";

export default async function MyList() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth`);
  }

  return (
    <div>
      <Link
        href={`/mylist/${encodeURIComponent(session?.user?.email || "")}`}
        className="
        block
        px-4 
        py-2 
        hover:bg-blue-500
      "
      >
        <p className="flex w-full justify-center">My List</p>
      </Link>
    </div>
  );
}
