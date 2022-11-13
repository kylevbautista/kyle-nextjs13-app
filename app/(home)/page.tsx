"use client";
import PageBase from "./components/PageBase";
import { getSeasonNow } from "../jinkan/seasonNow";
import { request } from "graphql-request";
import { graphQLClient } from "../../graphQL/graphqlClient";
import allCurrentAnimeQuery from "../../graphQL/queries/allCurrentAnimeQuery";
import Button from "./components/Button";

// export const dynamic = "force-dynamic",
//   dynamicParams = true,
//   revalidate = false,
//   fetchCache = "auto",
//   runtime = "nodejs",
//   preferredRegion = "auto";

export default async function Home() {
  const { data, errors, extensions, headers, status } =
    await graphQLClient.rawRequest(allCurrentAnimeQuery);
  console.log("data", data);
  console.log("headers", headers);
  return <PageBase data={data} />;
}
