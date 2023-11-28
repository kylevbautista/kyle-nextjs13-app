import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import resolvers from "@/server/graphql/resolvers";
import typeDefs from "@/server/graphql/typeDefs";

const apolloServer = new ApolloServer({ resolvers, typeDefs });

const handler = startServerAndCreateNextHandler(apolloServer, {
  context: async (req, res) => {
    /**
     * Checks if user is logged in before any request/query executed
     * If user not logged in, throw UNAUTHENTICATED error
     */
    let session = null;
    // Need this after migrating graphql to app router, route handler, missing res.getHeader via framework change, so added it back
    try {
      session = await getServerSession(
        req as unknown as NextApiRequest,
        {
          ...res,
          getHeader: (name: string) => res.headers?.get(name),
          setHeader: (name: string, value: string) =>
            res.headers?.set(name, value),
        } as unknown as NextApiResponse,
        authOptions
      );
    } catch (err) {
      console.log(err);
    }
    // if (!session) {
    //   throw new GraphQLError("User is not authenticated", {
    //     extensions: {
    //       code: "UNAUTHENTICATED",
    //       http: { status: 401 },
    //     },
    //   });
    // }
    return {
      req,
      res,
      session,
    };
  },
});

export { handler as GET, handler as POST };
