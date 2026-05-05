import { MongoClient } from "mongodb";
import type { AppConfig } from "./config.js";
import { MongoStore } from "./mongoStore.js";

export async function createMongoStore(config: AppConfig): Promise<MongoStore> {
  const client = new MongoClient(config.mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10_000
  });
  await client.connect();
  const store = new MongoStore(client, client.db(config.mongoDb));
  await store.ensureIndexes();
  return store;
}
