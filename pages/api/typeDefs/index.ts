import { mergeTypeDefs } from "@graphql-tools/merge";

import Test from "./Test/index.graphql";
import Test2 from "./Test2/index.graphql";

const typesArray = [Test, Test2];

const typeDefs = mergeTypeDefs(typesArray);

export default typeDefs;
