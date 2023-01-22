import { redirect } from "next/navigation";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { unstable_getServerSession } from "next-auth/next";
import PageBase from "../../components/mylist/PageBase";
import { Boundary } from "./Boundary";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

export const fetchCache = "default-no-store";

export default async function MyList() {
  const session = await unstable_getServerSession(authOptions);
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
