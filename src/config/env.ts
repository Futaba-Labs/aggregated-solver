import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // -- Private key
  PRIVATE_KEY: z.string(),
  // -- HTTP RPC
  HTTP_MAINNET_RPC_URL: z.string().url(),
  HTTP_BASE_RPC_URL: z.string().url(),
  HTTP_OPTIMISM_RPC_URL: z.string().url(),
  HTTP_ARBITRUM_RPC_URL: z.string().url(),
  HTTP_ZKSYNC_RPC_URL: z.string().url(),
  HTTP_LINEA_RPC_URL: z.string().url(),
  HTTP_BLAST_RPC_URL: z.string().url(),
  HTTP_POLYGON_RPC_URL: z.string().url(),
  HTTP_BSC_RPC_URL: z.string().url(),
});

const envResult = envSchema.safeParse({
  // -- Private key
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  // -- HTTP RPC
  HTTP_MAINNET_RPC_URL: process.env.HTTP_MAINNET_RPC_URL,
  HTTP_BASE_RPC_URL: process.env.HTTP_BASE_RPC_URL,
  HTTP_OPTIMISM_RPC_URL: process.env.HTTP_OPTIMISM_RPC_URL,
  HTTP_ARBITRUM_RPC_URL: process.env.HTTP_ARBITRUM_RPC_URL,
  HTTP_ZKSYNC_RPC_URL: process.env.HTTP_ZKSYNC_RPC_URL,
  HTTP_LINEA_RPC_URL: process.env.HTTP_LINEA_RPC_URL,
  HTTP_BLAST_RPC_URL: process.env.HTTP_BLAST_RPC_URL,
  HTTP_POLYGON_RPC_URL: process.env.HTTP_POLYGON_RPC_URL,
  HTTP_BSC_RPC_URL: process.env.HTTP_BSC_RPC_URL,
});

if (!envResult.success) {
  const error = envResult.error.issues.at(0);
  if (!error) throw new Error(envResult.error.toString());

  throw new Error(`${error.path}: ${error.message}`);
}

const env = envResult.data;

export default env;
