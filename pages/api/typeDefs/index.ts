import { mergeTypeDefs } from "@graphql-tools/merge";

import Test from "./Test";
import Test2 from "./Test2";

const typesArray = [Test, Test2];

const typeDefs = mergeTypeDefs(typesArray);

export default typeDefs;
