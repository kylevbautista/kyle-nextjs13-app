import { Db, MongoClient } from "mongodb";

/**
 * The app's only MongoDB client. It is shared by the NextAuth adapter
 * (server/auth) and all list reads/writes (server/lib/userList.ts).
 *
 * The connection promise is cached on globalThis so dev hot reloads and
 * warm serverless invocations reuse one pool. A failed connect is NOT cached:
 * the next caller starts a fresh attempt.
 */

const CONNECT_ATTEMPTS = 2;
/** Fail fast when the cluster is unreachable (the driver default is 30 s per attempt). */
const SERVER_SELECTION_TIMEOUT_MS = 8_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(uri: string): Promise<MongoClient> {
  let lastError: unknown;
  for (let attempt = 0; attempt < CONNECT_ATTEMPTS; attempt++) {
    try {
      return await new MongoClient(uri, {
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      }).connect();
    } catch (err) {
      lastError = err;
      if (attempt < CONNECT_ATTEMPTS - 1) await sleep(250 * 2 ** attempt);
    }
  }
  throw lastError;
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error('Missing environment variable "MONGODB_URI" (see CLAUDE.md §1)')
    );
  }
  if (!globalThis._mongoClientPromise) {
    const promise = connectWithRetry(uri);
    globalThis._mongoClientPromise = promise;
    promise.catch(() => {
      if (globalThis._mongoClientPromise === promise) {
        globalThis._mongoClientPromise = undefined;
      }
    });
  }
  return globalThis._mongoClientPromise;
}

/** The default database from MONGODB_URI (same one NextAuth uses). */
export async function getDb(): Promise<Db> {
  return (await getMongoClient()).db();
}
