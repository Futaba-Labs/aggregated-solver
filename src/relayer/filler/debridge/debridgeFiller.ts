import { CustomGasFiller } from '..';
import { IntentAggregaterClient } from '../../../clients';
import { Config } from '../../../config';
import { DeBridgeFillOrderMetadata, Intent } from '../../../types';

export class DebridgeFiller extends CustomGasFiller<DeBridgeFillOrderMetadata> {
  // 0.04% (4bps)
  private readonly RELAYER_FEE_PCT = 0.0004;

  constructor(
    intent: Intent<'debridge', DeBridgeFillOrderMetadata>,
    config: Config,
    intentAggregaterClient: IntentAggregaterClient
  ) {
    super(intent, config, intentAggregaterClient);
  }

  protected override async calculateRelayerFee() {
    return Number(this.intent.input.amount) * this.RELAYER_FEE_PCT;
  }
}
