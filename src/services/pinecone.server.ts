import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "../utils/env";
import { singleton } from "../libs/singleton";

export const pinecone = singleton<Pinecone>("pinecone", () => {
  const client = new Pinecone({ apiKey: config.pineconeApiKey });

  return client;
});
