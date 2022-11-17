import PageBase from "./components/PageBase";
import { graphQLClient } from "../../graphQL/graphqlClient";
import allCurrentAnimeQueryFetch from "../../graphQL/queries/allCurrentAnimeQueryFetch";

// export const dynamic = "force-dynamic",
//   dynamicParams = true,
//   revalidate = false,
//   fetchCache = "force-no-store",
//   runtime = "nodejs",
//   preferredRegion = "auto";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */
const getData = async () => {
  
  try {
    const dateObject = new Date();
    const year = dateObject.getUTCFullYear();
    const res = await fetch("https://graphql.anilist.co", {
      cache: "no-store",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: allCurrentAnimeQueryFetch,
        variables: {
          year: year,
        },
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
  const { data } = (await getData()) || {};
  return <PageBase data={data} />;
}
