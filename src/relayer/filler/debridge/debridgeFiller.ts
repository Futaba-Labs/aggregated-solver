import { CustomGasFiller } from '..';
import { IntentAggregaterClient } from '../../../clients';
import { ChainConfig, Config } from '../../../config';
import { DeBridgeFillOrderMetadata, FillRequest, Intent } from '../../../types';
import { logWithLabel } from '../../../utils';
import { DEFAULT_GAS_USED } from './constants';

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
    const fee = Number(this.intent.input.amount) * this.RELAYER_FEE_PCT;
    logWithLabel({
      labelText: 'DebridgeFiller:calculateRelayerFee',
      level: 'info',
      message: `Relayer fee: ${fee}`,
    });
    return fee > 0 ? fee : 0;
  }

  protected override async calculateGasFee(
    fillData: FillRequest,
    chainConfig: ChainConfig,
    defaultGasUsed: bigint
  ) {
    return super.calculateGasFee(fillData, chainConfig, DEFAULT_GAS_USED);
  }
}
