export interface AcrossMetadata {
  destinationChainId: bigint;
  depositId: number;
  depositor: string;
  inputToken: string;
  outputToken: string;
  inputAmount: bigint;
  outputAmount: bigint;
  quoteTimestamp: number;
  fillDeadline: number;
  exclusivityDeadline: number;
  recipient: string;
  exclusiveRelayer: string;
  message: string;
}
