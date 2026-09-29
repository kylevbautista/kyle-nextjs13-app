import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { airingSchedulePath, signInPath } from "@/lib/routes";

/** /mylist → the signed-in user's own airing schedule. */
export default async function MyAiringScheduleRedirect() {
  const session = await getServerSession(authOptions);
  if (session?.objectId) redirect(airingSchedulePath(session.objectId));
  redirect(signInPath("/mylist"));
}
