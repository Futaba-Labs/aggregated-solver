import { Config } from '../../config';
import { DeBridgeFillOrderMetadata, Intent } from '../../types';
import { logWithLabel } from '../../utils';
import { BaseSettler } from '../baseSettler';
import {
  DEBRIDGE_ADDRESSES,
  DEBRIDGE_DST_ABI,
  DEBRIDGE_MESSAGING_FEE,
} from './constants';

export class DebridgeSettler extends BaseSettler<DeBridgeFillOrderMetadata> {
  constructor(
    config: Config,
    intent: Intent<string, DeBridgeFillOrderMetadata>
  ) {
    super(config, intent);
  }

  async settleIntent() {
    const { request } = await this.chainConfig.publicClient.simulateContract({
      account: this.config.common.relayerAddress,
      address: DEBRIDGE_ADDRESSES.dst,
      abi: DEBRIDGE_DST_ABI,
      functionName: 'sendEvmUnlock',
      args: [this.intent.orderId, this.intent.metadata.unlockAuthority, 0],
      value: DEBRIDGE_MESSAGING_FEE[this.chainConfig.chainId],
    });

    const hash = await this.chainConfig.walletClient.writeContract(request);

    const transaction =
      await this.chainConfig.publicClient.waitForTransactionReceipt({ hash });

    if (transaction.status !== 'success') {
      logWithLabel({
        labelText: 'DebridgeSettler:settleIntent',
        level: 'info',
        message: `Transaction successful: ${hash}`,
      });
      return;
    } else {
      logWithLabel({
        labelText: 'DebridgeSettler:settleIntent',
        level: 'warn',
        message: `Transaction failed: ${hash}`,
      });
    }
  }

  async settleBatchIntents() {
    // TODO: Implement
  }
}
