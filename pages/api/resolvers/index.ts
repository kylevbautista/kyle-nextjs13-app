import { mergeResolvers } from "@graphql-tools/merge";

import Test from "./Test";
import Test2 from "./Test2";

const resolversArray = [Test, Test2];

const resolvers = mergeResolvers(resolversArray);

export default resolvers;
