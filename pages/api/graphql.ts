import { ApolloServer } from "@apollo/server";
// import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { getSession } from "next-auth/react";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { GraphQLError } from "graphql";
import { startServerAndCreateNextHandler } from "../../lib/graphqlMongooseHandler";

import resolvers from "./resolvers";
import typeDefs from "./typeDefs";

const server = new ApolloServer({
  resolvers,
  typeDefs,
});

export default startServerAndCreateNextHandler(server, {
  context: async (req, res) => {
    /**
     * Checks if user is logged in before any request/query executed
     * If user not logged in, throw UNAUTHENTICATED error
     */
    const session = await getSession({ req });
    if (!session) {
      throw new GraphQLError("User is not authenticated", {
        extensions: {
          code: "UNAUTHENTICATED",
          http: { status: 401 },
        },
      });
    }
    return {
      req,
      res,
      session,
    };
  },
});
