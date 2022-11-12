import { GraphQLClient } from "graphql-request";
//https://graphql.anilist.co/

export const graphQLClient = new GraphQLClient("https://graphql.anilist.co", {
  headers: {},
});
