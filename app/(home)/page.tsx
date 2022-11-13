import PageBase from "./components/PageBase";
import { getSeasonNow } from "../jinkan/seasonNow";
import { request } from "graphql-request";
import { graphQLClient } from "../../graphQL/graphqlClient";
import allCurrentAnimeQuery from "../../graphQL/queries/allCurrentAnimeQuery";
import Button from "./components/Button";

export const dynamic = "auto",
  dynamicParams = true,
  revalidate = false,
  fetchCache = "force-no-store",
  runtime = "nodejs",
  preferredRegion = "auto";

export default async function Home() {
  const { data, errors, extensions, headers, status } =
    await graphQLClient.rawRequest(allCurrentAnimeQuery);
  return <PageBase data={data} />;
}
