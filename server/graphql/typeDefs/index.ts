import { mergeTypeDefs } from "@graphql-tools/merge";

import Test from "./Test/index.graphql";
import Test2 from "./Test2/index.graphql";
import AnimeList from "./AnimeList/index.graphql";

const typesArray = [Test, Test2, AnimeList];

const typeDefs = mergeTypeDefs(typesArray);

export default typeDefs;
