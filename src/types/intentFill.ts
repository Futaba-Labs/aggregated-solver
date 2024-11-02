import { IntentAggregaterClient } from "../clients";
import { CHAIN_IDs, Config } from "../config";
import { Intent } from "./intentFetch";

export interface FillRequest<FillOrderArgs = unknown> {
  chainId: CHAIN_IDs;
  contractAddress: string;
  value: bigint;
  functionName: string;
  args: FillOrderArgs;
  data: string;
}

export type IntentExecution = (
  intent: Intent,
  config: Config,
  client: IntentAggregaterClient
) => Promise<void>;
