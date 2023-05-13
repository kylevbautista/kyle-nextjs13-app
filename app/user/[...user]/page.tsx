import { authOptions } from "@/server/auth";
import { getServerSession } from "next-auth/next";
import { Boundary } from "./Boundary";
import { getUserAnimeListOptimized } from "@/server/lib/ssrQueries/getUserAnimeList";
import { notFound } from "next/navigation";
import { ClientComp } from "../_client/ClientComp";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

export const fetchCache = "default-no-store";

export default async function MyList({ params }: any) {
  const { user = [] } = params;
  const [userParam = null] = user;

  const session = await getServerSession(authOptions);

  const { data = null } = await getUserAnimeListOptimized({
    objectId: session?.objectId,
    userParam: userParam,
  });

  if (!data?.hasAccount) {
    return notFound();
  }

  const list = data?.getUserAnimeList?.list || [];

  return (
    <>
      <ClientComp data={list} userParam={userParam} />
    </>
  );
}
