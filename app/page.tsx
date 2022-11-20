import PageBase from "../components/year/PageBase";
import { graphQLClient } from "../graphQL/graphqlClient";
import allCurrentAnimeQueryFetch from "../graphQL/queries/allCurrentAnimeQueryFetch";
// import { redirect } from "next/navigation";

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
  // const dateObject = new Date();
  // const currentYear = dateObject.getUTCFullYear();
  // redirect(`/${currentYear}`);
  const { data } = (await getData()) || {};
  return <PageBase data={data} />;
}
