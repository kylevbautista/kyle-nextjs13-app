import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { myListPath, signInPath } from "@/lib/routes";

/** /user → the signed-in user's list, or sign in first. */
export default async function MyListIndex() {
  const session = await getServerSession(authOptions);
  if (session?.objectId) redirect(myListPath(session.objectId));
  redirect(signInPath("/user"));
}
