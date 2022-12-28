import { mergeResolvers } from "@graphql-tools/merge";

import Test from "./Test";
import Test2 from "./Test2";
import AnimeList from "./AnimeList";

const resolversArray = [Test, Test2, AnimeList];

const resolvers = mergeResolvers(resolversArray);

export default resolvers;
