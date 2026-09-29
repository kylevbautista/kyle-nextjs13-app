import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GithubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import type { MongoClient } from "mongodb";
import { getMongoClient } from "../lib/mongodb";

/**
 * MongoDBAdapter awaits its client promise once, so an adapter built on a
 * failed connection would stay broken until the server restarts. next-auth
 * reads `authOptions.adapter` on every request, so the getter below builds a
 * new adapter whenever getMongoClient() has started a new connection attempt.
 */
let cachedAdapter: { client: Promise<MongoClient>; adapter: Adapter } | undefined;
const getAdapter = (): Adapter => {
  const client = getMongoClient();
  if (!cachedAdapter || cachedAdapter.client !== client) {
    cachedAdapter = { client, adapter: MongoDBAdapter(client) };
  }
  return cachedAdapter.adapter;
};

const providers: NextAuthOptions["providers"] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorization: { params: { prompt: "select_account" } },
  }),
];
// Only offer providers that are actually configured.
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GithubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })
  );
}
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  providers.push(
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      version: "2.0",
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  get adapter() {
    return getAdapter();
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    /**
     * Sessions use the "database" strategy (the default with an adapter), so
     * `user` is the Mongo user. `session.objectId` is the user's ObjectId hex:
     * every list write is scoped by it and list URLs are /user/<objectId>.
     */
    async session({ session, user }) {
      session.objectId = user.id;
      return session;
    },
  },
};
