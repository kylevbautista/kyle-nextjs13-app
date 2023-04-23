import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { getServerSession } from "next-auth/next";
import { Boundary } from "./Boundary";

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

  return (
    <>
      {/* @ts-ignore */}
      <Boundary session={session} userParam={userParam} />
    </>
  );
}
