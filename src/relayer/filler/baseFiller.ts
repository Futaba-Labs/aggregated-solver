import { Hex } from 'viem';
import { Address } from 'viem';

import { IntentAggregaterClient } from '../../clients';
import { CHAIN_IDs } from '../../config';
import {
  Config,
  fetchDstChainFilter,
  fetchProtocolConfig,
  getChainConfig,
} from '../../config/config';
import { Intent } from '../../types';
import { logWithLabel } from '../../utils';

export class BaseFiller {
  constructor(
    private readonly intent: Intent,
    private readonly config: Config,
    private readonly intentAggregaterClient: IntentAggregaterClient
  ) {}

  async fillIntent() {
    if (await this.useSimulation()) {
      await this.simulateTransaction();
    } else {
      if (await this.useIntentAggregater(this.intent.output.chainId)) {
        await this.fillIntentWithIntentAggregater();
      } else {
        await this.fillIntentWithWalletClient();
      }
    }
  }

  private async fillIntentWithWalletClient() {
    const { txParams, chainConfig } = await this.signTransaction();

    logWithLabel({
      labelText: 'BaseFiller:fillIntent',
      level: 'info',
      message: `Sending transaction to wallet client...`,
    });

    const hash = await chainConfig.walletClient.sendTransaction(txParams);

    const transaction =
      await chainConfig.publicClient.waitForTransactionReceipt({ hash });

    if (transaction.status === 'success') {
      logWithLabel({
        labelText: 'BaseFiller:fillIntent',
        level: 'info',
        message: `Transaction successful: ${hash}`,
      });
    } else {
      logWithLabel({
        labelText: 'BaseFiller:fillIntent',
        level: 'warn',
        message: `Transaction failed: ${hash}`,
      });
    }
  }

  private async fillIntentWithIntentAggregater() {
    const { txParams, chainConfig } = await this.signTransaction();

    const signedTx = await chainConfig.walletClient.signTransaction(txParams);

    logWithLabel({
      labelText: 'BaseFiller:fillIntentWithIntentAggregater',
      level: 'info',
      message: `Sending signed transaction to intent aggregater...`,
    });

    const response = await this.intentAggregaterClient.sendIntent(
      this.intent,
      signedTx
    );

    if (response.status === 'success') {
      logWithLabel({
        labelText: 'BaseFiller:fillIntentWithIntentAggregater',
        level: 'info',
        message: `Transaction successful`,
      });
    } else {
      logWithLabel({
        labelText: 'BaseFiller:fillIntentWithIntentAggregater',
        level: 'warn',
        message: `Transaction failed`,
      });
    }
  }

  private async simulateTransaction() {
    const { txParams, chainConfig } = await this.signTransaction();

    try {
      logWithLabel({
        labelText: 'BaseFiller:simulateTransaction',
        level: 'info',
        message: `Simulating transaction...`,
      });

      await chainConfig.publicClient.estimateGas(txParams);

      logWithLabel({
        labelText: 'BaseFiller:simulateTransaction',
        level: 'info',
        message: `Simulation successful`,
      });
    } catch (error) {
      logWithLabel({
        labelText: 'BaseFiller:simulateTransaction',
        level: 'warn',
        message: `Simulation failed: ${error}`,
      });
    }
  }

  private async signTransaction() {
    const gasInfo = await this.calculateGasFee();
    const fillData = await this.fetchFillData();
    const chainConfig = getChainConfig(this.config, fillData.chainId);

    let txParams;
    txParams = {
      account: this.config.common.relayerAddress,
      chain: chainConfig.walletClient.chain,
      to: fillData.contractAddress as Address,
      value: BigInt(fillData.value),
      data: fillData.data as Hex,
    };

    if (gasInfo.gasPrice !== BigInt(0)) {
      txParams = {
        ...txParams,
        gasPrice: gasInfo.gasPrice,
      };
    } else if (
      gasInfo.maxFeePerGas !== BigInt(0) &&
      gasInfo.maxPriorityFeePerGas !== BigInt(0)
    ) {
      txParams = {
        ...txParams,
        maxFeePerGas: gasInfo.maxFeePerGas,
        maxPriorityFeePerGas: gasInfo.maxPriorityFeePerGas,
      };
    }

    if (gasInfo.gasLimit !== BigInt(0)) {
      txParams = {
        ...txParams,
        gas: gasInfo.gasLimit,
      };
    }

    return { txParams, chainConfig };
  }

  private async fetchFillData() {
    return await this.intentAggregaterClient.fetchFillData(
      this.intent,
      'source'
    );
  }

  private async useIntentAggregater(chainId: CHAIN_IDs) {
    const dstChainFilter = fetchDstChainFilter(this.intent.source, chainId);
    return dstChainFilter.useIntentAggregater;
  }

  private async useSimulation() {
    const protocolConfig = fetchProtocolConfig(this.intent.source);
    return protocolConfig.simulate;
  }

  protected async calculateGasFee() {
    return {
      gasLimit: BigInt(0),
      gasPrice: BigInt(0),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };
  }
}
