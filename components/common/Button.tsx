"use client";
import { graphQLClient } from "../utils/graphql/graphqlClient";
import allCurrentAnimeTag from "../utils/graphql/queries/allCurrentAnimeTag.graphql";

export default function Button() {
  const onClick = async () => {
    try {
      const { data, errors, extensions, headers, status } =
        await graphQLClient.rawRequest(allCurrentAnimeTag);
      console.log(data);
      console.log("Kylelog", { headers: headers, status: status });
      console.log("time: ", data.Page.media[0].upcomingEpisode.timeUntilAiring);
      let airingAt = data.Page.media[0].firstEpisode.episode[0].airingAt || 0;
      console.log("Kylelog airingAt", airingAt);
    } catch (err) {
      console.log("error", err);
    }
  };
  return (
    <>
      <button
        onClick={onClick}
        className="rounded-2xl bg-blue-800 hover:shadow-md hover:shadow-white max-w-max max-h-max"
      >
        Button
      </button>
    </>
  );
}
