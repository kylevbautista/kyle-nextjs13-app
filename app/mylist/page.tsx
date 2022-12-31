import { Suspense } from "react";
import { redirect } from "next/navigation";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { unstable_getServerSession } from "next-auth/next";
import PageBase from "../../components/mylist/PageBase";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

export default async function MyList() {
  const session = await unstable_getServerSession(authOptions);
  if (!session) {
    redirect(`/auth`);
  }

  return (
    <Suspense
      fallback={
        <div
          className="
            flex 
            flex-col 
            justify-center 
            items-center 
            sm:p-4
            text-white
        "
        >
          <p>Loading Your Anime list...</p>
        </div>
      }
    >
      {/* @ts-ignore */}
      <PageBase />
    </Suspense>
  );
}
