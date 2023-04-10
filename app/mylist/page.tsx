import { redirect } from "next/navigation";
import { authOptions } from "../../server/auth";
import { getServerSession } from "next-auth/next";
import { Boundary } from "./Boundary";

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
    <>
      {/* @ts-ignore */}
      <Boundary session={session} />
    </>
  );
}
