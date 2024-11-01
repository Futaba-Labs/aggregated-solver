import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // -- Private key
  PRIVATE_KEY: z.string(),
  // -- Aggregator URL
  AGGREGATOR_URL: z.string().url(),
  AGGREGATOR_WS_URL: z.string().url(),
  // -- HTTP RPC
  RPC_PROVIDER_1: z.string().url(),
  RPC_PROVIDER_10: z.string().url(),
  RPC_PROVIDER_56: z.string().url(),
  RPC_PROVIDER_137: z.string().url(),
  RPC_PROVIDER_59144: z.string().url(),
  RPC_PROVIDER_8453: z.string().url(),
  RPC_PROVIDER_42161: z.string().url(),
  RPC_PROVIDER_324: z.string().url(),
  RPC_PROVIDER_81457: z.string().url(),
  RPC_PROVIDER_534352: z.string().url(),
  RPC_PROVIDER_480: z.string().url(),
});

const envResult = envSchema.safeParse({
  // -- Private key
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  // -- Aggregator URL
  AGGREGATOR_URL: process.env.AGGREGATOR_URL,
  AGGREGATOR_WS_URL: process.env.AGGREGATOR_WS_URL,
  // -- HTTP RPC
  RPC_PROVIDER_1: process.env.RPC_PROVIDER_1,
  RPC_PROVIDER_10: process.env.RPC_PROVIDER_10,
  RPC_PROVIDER_56: process.env.RPC_PROVIDER_56,
  RPC_PROVIDER_137: process.env.RPC_PROVIDER_137,
  RPC_PROVIDER_59144: process.env.RPC_PROVIDER_59144,
  RPC_PROVIDER_8453: process.env.RPC_PROVIDER_8453,
  RPC_PROVIDER_42161: process.env.RPC_PROVIDER_42161,
  RPC_PROVIDER_324: process.env.RPC_PROVIDER_324,
  RPC_PROVIDER_81457: process.env.RPC_PROVIDER_81457,
  RPC_PROVIDER_534352: process.env.RPC_PROVIDER_534352,
  RPC_PROVIDER_480: process.env.RPC_PROVIDER_480,
});

if (!envResult.success) {
  const error = envResult.error.issues.at(0);
  if (!error) throw new Error(envResult.error.toString());

  throw new Error(`${error.path}: ${error.message}`);
}

const env = envResult.data;

export default env;

export interface RPC_PROVIDER {
  RPC_PROVIDER_1: string;
  RPC_PROVIDER_10: string;
  RPC_PROVIDER_56: string;
  RPC_PROVIDER_137: string;
  RPC_PROVIDER_59144: string;
  RPC_PROVIDER_8453: string;
  RPC_PROVIDER_42161: string;
  RPC_PROVIDER_324: string;
  RPC_PROVIDER_81457: string;
  RPC_PROVIDER_534352: string;
  RPC_PROVIDER_480: string;
}
