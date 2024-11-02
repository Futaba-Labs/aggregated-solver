import { zeroAddress } from 'viem';

import { Config } from '../../config/config';
import { Intent } from '../../types';
import { BaseFilter } from './baseFilter';
import { logWithLabel } from '../../utils';

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

export class AcrossFilter extends BaseFilter {
  constructor(intent: Intent<'across', AcrossMetadata>, config: Config) {
    super(config, intent);
  }

  async filter() {
    const metadata = this.intent.metadata as AcrossMetadata;
    const exclusiveRelayer = metadata.exclusiveRelayer;

    // filter by exclusive relayer
    if (
      exclusiveRelayer !== this.config.common.relayerAddress &&
      exclusiveRelayer !== zeroAddress
    ) {
      logWithLabel({
        labelText: 'AcrossFilter:filter',
        level: 'info',
        message: `Skipping order with exclusive relayer: ${exclusiveRelayer}`,
      });
      return false;
    }
    return super.filter();
  }
}
