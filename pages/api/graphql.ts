import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { getSession } from "next-auth/react";
import { GraphQLError } from "graphql";
import { NextApiHandler } from "next";
import dbConnect from "../../lib/dbConnect";

import resolvers from "./resolvers";
import typeDefs from "./typeDefs";

const server = new ApolloServer({
  resolvers,
  typeDefs,
});

/**
 * Modified handler to initialize db connection
 * and apollo server start
 */
const handler: NextApiHandler = async (req, res) => {
  /**
   * Connect to MongoDb atlas through mongoose method
   * so that I can use mongoose orm
   */
  await dbConnect();

  /**
   * use standalone apollo handler
   */
  await startServerAndCreateNextHandler(server, {
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
  })(req, res);
};

export default handler;
