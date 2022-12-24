import PageBase from "../../components/auth/PageBase";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { unstable_getServerSession } from "next-auth/next";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

export default async function Auth() {
  const session = await unstable_getServerSession(authOptions);
  // console.log("kylelog serverside session:", session);
  return <PageBase />;
}
