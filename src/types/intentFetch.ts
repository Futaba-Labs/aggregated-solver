import { IntentAggregaterClient } from '../clients';
import { CHAIN_IDs } from '../config';
import { Config } from '../config/config';

/**
 * Represents the input for an intent.
 * @example
 * const input: IntentInput = {
 *   chainId: 1, // Ethereum Mainnet
 *   hash: "0x1234567890123456789012345678901234567890",
 *   contractAddress: "0x1234567890123456789012345678901234567890",
 *   from: "0x1234567890123456789012345678901234567890",
 *   tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
 *   amount: 1000000000000000000n, // 1 ETH in wei
 * };
 */
export interface IntentInput {
  /** Chain ID of the intent */
  chainId: CHAIN_IDs;

  /** Transaction Hash */
  hash: string;

  /** Contract address that emit the intent event */
  contractAddress: string;

  /** Initiator of the intent */
  from: string;

  /** Token contract address */
  tokenAddress: string;

  /** Amount of token */
  amount: bigint;
}

/**
 * Represents the output for an intent.
 * @example
 * const output: IntentOutput = {
 *   chainId: 56, // Binance Smart Chain
 *   hash: "0x1234567890123456789012345678901234567890", // nullable
 *   contractAddress: "0x1234567890123456789012345678901234567890",
 *   recipient: "0x1234567890123456789012345678901234567890",
 *   tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
 *   amount: 1000000000000000000n, // 1 ETH in wei
 * };
 */
export interface IntentOutput {
  /** Chain ID of the intent destination */
  chainId: CHAIN_IDs;

  /** Transaction Hash */
  hash: string | null;

  /** Contract address to fulfill the intent */
  contractAddress: string;

  /** Recipient of the token */
  recipient: string;

  /** Token contract address */
  tokenAddress: string;

  /** Amount of token */
  amount: bigint;
}

/**
 * Represents the possible statuses of an intent.
 * @example
 * const status: IntentStatus = 'pending';
 * const status: IntentStatus = 'fulfilled';
 * const status: IntentStatus = 'expired';
 */
export type IntentStatus = 'pending' | 'fulfilled' | 'expired';

/**
 * Represents an intent with source, order metadata and fill metadata.
 * @template Source The string literal of intent source name.
 * @template Metadata The type of the order metadata.
 * @example
 *
 * interface Metadata {
 *   message: string;
 * }
 *
 * const intent: Intent<"custom", Metadata> = {
 *   id: "1",
 *   source: "custom",
 *   orderId: "1234",
 *   input: {
 *     chainId: 1, // Ethereum Mainnet
 *     contractAddress: "0x1234567890123456789012345678901234567890",
 *     from: "0x1234567890123456789012345678901234567890",
 *     token: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
 *     amount: 1000000000000000000n, // 1 ETH in wei
 *   },
 *   output: {
 *     chainId: 56, // Binance Smart Chain
 *     contractAddress: "0x1234567890123456789012345678901234567890",
 *     recipient: "0x1234567890123456789012345678901234567890",
 *     token: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
 *     amount: 1000000000000000000n, // 1 ETH in wei
 *   },
 *   status: 'pending',
 *   deadline: Date.now() + 3600000, // 1 hour from now
 *   metadata: {
 *     message: "Hello World!",
 *   },
 * };
 *
 */
export interface Intent<Source extends string = string, Metadata = unknown> {
  /** Miki intent id */
  id: string;

  /** Intent source */
  source: Source;

  /** Intent order id, can be `depositId` or `orderId` based on the intent source*/
  orderId: string;

  /** Timestamp of the intent fulfillment deadline */
  deadline: number | null;

  /** Intent status */
  status: IntentStatus;

  /** Intent input */
  input: IntentInput;

  /** Intent output */
  output: IntentOutput;

  /** Intent order metadata */
  metadata: Metadata;
}

export type CustomFilter = (intent: Intent, config: Config) => Promise<boolean>;
