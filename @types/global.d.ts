import type { MongoClient } from "mongodb";

declare global {
  // Cached connection promise, see server/lib/mongodb.ts
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export {};
