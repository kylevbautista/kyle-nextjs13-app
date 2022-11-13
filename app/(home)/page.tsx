import PageBase from "./components/PageBase";
import { getSeasonNow } from "../jinkan/seasonNow";
import { request } from "graphql-request";
import { graphQLClient } from "../../graphQL/graphqlClient";
import allCurrentAnimeQuery from "../../graphQL/queries/allCurrentAnimeQuery";
import allCurrentAnimeQueryFetch from "../../graphQL/queries/allCurrentAnimeQueryFetch";
import Button from "./components/Button";

// If no cache we need fallback?

// export const dynamic = "force-dynamic",
//   dynamicParams = true,
//   revalidate = false,
//   fetchCache = "auto",
//   runtime = "nodejs",
//   preferredRegion = "auto";

const getData = async () => {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      cache: "no-store",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: allCurrentAnimeQueryFetch,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export default async function Home() {
  // const { data, errors, extensions, headers, status } =
  //   await graphQLClient.rawRequest(allCurrentAnimeQuery);
  // console.log("data", data);
  // console.log("headers", headers);
  const { data } = (await getData()) || {};
  return <PageBase data={data} />;
}
