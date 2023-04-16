import { ReactNode } from "react";
import { TestProvider } from "@/components/mylist/TestProvider";
import PageBase from "@/components/mylist/PageBase";
import { getUserAnimeListOptimized } from "@/server/lib/ssrQueries/getUserAnimeList";
import { notFound } from "next/navigation";

interface PageBaseProps {
  session?: any;
  userParam: string | null;
  children?: ReactNode;
}

export async function Boundary({
  session,
  userParam,
  children,
}: PageBaseProps) {
  const { data = null } = await getUserAnimeListOptimized({
    objectId: session?.objectId,
    userParam: userParam,
  });

  if (!data?.hasAccount) {
    return notFound();
  }
  const list = data?.getUserAnimeList?.list || [];

  return (
    <TestProvider data={list} userParam={userParam}>
      <PageBase session={session} userParam={userParam} />
    </TestProvider>
  );
}
