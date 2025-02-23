import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  PORT: z
    .string()
    .transform((port) => parseInt(port, 10))
    .default("3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MONGODB_URI: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_APP_TOKEN: z.string().min(1),
  SLACK_BOT_TOKEN: z.string().min(1),
  PINECONE_API_KEY: z.string().min(1),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  mongodbUri: env.MONGODB_URI,
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  slackSigningSecret: env.SLACK_SIGNING_SECRET,
  slackAppToken: env.SLACK_APP_TOKEN,
  slackBotToken: env.SLACK_BOT_TOKEN,
  pineconeApiKey: env.PINECONE_API_KEY,
};
