import PageBase from "./components/PageBase";
import { getSeasonNow } from "../jinkan/seasonNow";
import { request } from "graphql-request";
import { graphQLClient } from "../../graphQL/graphqlClient";
import allCurrentAnimeQuery from "../../graphQL/queries/allCurrentAnimeQuery";
import Button from "./components/Button";
import AnimeInfoGrid from "./components/AnimeInfoGrid";

export default async function Home() {
  const data = await getSeasonNow();
  const data2 = await graphQLClient.request(allCurrentAnimeQuery);
  console.log("Kylelog", data2);
  return <PageBase data={data} />;
  // return <AnimeInfoGrid />;
}
