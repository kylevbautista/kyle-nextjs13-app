import { ReactNode } from "react";
import { headers } from "next/headers";
import { print as stringifyTag } from "graphql";
import getUserAnimeListQuery from "../../graphql/tags/getUserAnimeList.graphql";
import { TestProvider } from "../../components/mylist/TestProvider";
import PageBase from "../../components/mylist/PageBase";

interface PageBaseProps {
  children?: ReactNode;
}

const getUserAnimeList = async () => {
  const protocol = headers().get("x-forwarded-proto") || "http";
  const host = headers().get("host");
  /**
   * When using next-auth with server side calls,
   * must add cookies to req or else getSession won't work.
   */
  const cookies = headers().get("cookie");
  const baseUrl = `${protocol}://${host}`;
  try {
    /**
     * If calling /api routes from the server,
     * it must be an absolute url.
     * However, client side /api calls can be relative.
     */
    const res = await fetch(`${baseUrl}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${cookies}`,
      },
      body: JSON.stringify({
        query: stringifyTag(getUserAnimeListQuery),
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export async function Boundary({ children }: PageBaseProps) {
  const { data = {} } = await getUserAnimeList();
  const list = data?.getUserAnimeList?.list || [];

  return (
    <TestProvider data={list}>
      <PageBase />
    </TestProvider>
  );
}
