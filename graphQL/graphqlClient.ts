import { GraphQLClient } from "graphql-request";

export const graphQLClient = new GraphQLClient(
  `${process.env.GRAPHQL_ANILIST}`,
  {
    headers: {},
  }
);
