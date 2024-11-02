import { zeroAddress } from 'viem';

import { Config } from '../../config/config';
import { AcrossMetadata, Intent } from '../../types';
import { BaseFilter } from './baseFilter';
import { logWithLabel } from '../../utils';

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
