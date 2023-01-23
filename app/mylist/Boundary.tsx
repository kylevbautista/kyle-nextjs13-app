import { ReactNode } from "react";
import { TestProvider } from "../../components/mylist/TestProvider";
import PageBase from "../../components/mylist/PageBase";
import { getUserAnimeListOptimized } from "../../server/lib/ssrQueries/getUserAnimeList";

interface PageBaseProps {
  session?: any;
  children?: ReactNode;
}

export async function Boundary({ session, children }: PageBaseProps) {
  // const { data = {} } = await getUserAnimeList();
  // const list = data?.getUserAnimeList?.list || [];
  const { data = null } = await getUserAnimeListOptimized({
    objectId: session?.objectId,
  });
  const list = data?.getUserAnimeList?.list || [];

  return (
    <TestProvider data={list}>
      <PageBase />
    </TestProvider>
  );
}
