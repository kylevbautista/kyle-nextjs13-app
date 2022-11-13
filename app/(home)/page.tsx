import PageBase from "./components/PageBase";
import { getSeasonNow } from "../jinkan/seasonNow";
import { request } from "graphql-request";
import { graphQLClient } from "../../graphQL/graphqlClient";
import allCurrentAnimeQuery from "../../graphQL/queries/allCurrentAnimeQuery";
import Button from "./components/Button";

export default async function Home() {
  // const data = await getSeasonNow();
  const { data, errors, extensions, headers, status } =
    await graphQLClient.rawRequest(allCurrentAnimeQuery);
  return <PageBase data={data} />;
  // return <Button />;
}
