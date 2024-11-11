import { Hex } from 'viem';
import { Address } from 'viem';

import { IntentAggregaterClient } from '../../clients';
import { CHAIN_IDs } from '../../config';
import {
  ChainConfig,
  Config,
  fetchDstChainFilter,
  fetchProtocolConfig,
  getChainConfig,
} from '../../config/config';
import { FillRequest, Intent } from '../../types';
import { logWithLabel } from '../../utils';

export interface GasInfo {
  gasUsed: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export class BaseFiller<T> {
  constructor(
    protected readonly intent: Intent<string, T>,
    protected readonly config: Config,
    private readonly intentAggregaterClient: IntentAggregaterClient
  ) {}

  async fillIntent() {
    const fillData = await this.fetchFillData();

    const chainConfig = getChainConfig(this.config, fillData.chainId);

    const gasInfo = await this.calculateGasFee(
      fillData,
      chainConfig,
      BigInt(0)
    );

    if (!gasInfo) {
      logWithLabel({
        labelText: `${this.intent.source}Filler:initialize`,
        level: 'warn',
        message: `Gas info is null`,
      });
      return;
    }

    const txParams = this.createTransaction(fillData, gasInfo, chainConfig);

    if (await this.useSimulation()) {
      await this.simulateTransaction(txParams, chainConfig);
    } else {
      if (await this.useIntentAggregater(this.intent.output.chainId)) {
        await this.fillIntentWithIntentAggregater(txParams, chainConfig);
      } else {
        await this.fillIntentWithWalletClient(txParams, chainConfig);
      }
    }
  }

  private async fillIntentWithWalletClient(
    txParams: any,
    chainConfig: ChainConfig
  ) {
    logWithLabel({
      labelText: `${this.intent.source}Filler:fillIntent`,
      level: 'info',
      message: `Sending transaction to wallet client...`,
    });

    const hash = await chainConfig.walletClient.sendTransaction(txParams);

    const transaction =
      await chainConfig.publicClient.waitForTransactionReceipt({ hash });

    if (transaction.status === 'success') {
      logWithLabel({
        labelText: `${this.intent.source}Filler:fillIntent`,
        level: 'info',
        message: `Transaction successful: ${hash}`,
      });
    } else {
      logWithLabel({
        labelText: `${this.intent.source}Filler:fillIntent`,
        level: 'warn',
        message: `Transaction failed: ${hash}`,
      });
    }
  }

  private async fillIntentWithIntentAggregater(
    txParams: any,
    chainConfig: ChainConfig
  ) {
    const signedTx = await chainConfig.walletClient.signTransaction(txParams);

    logWithLabel({
      labelText: `${this.intent.source}Filler:fillIntentWithIntentAggregater`,
      level: 'info',
      message: `Sending signed transaction to intent aggregater...`,
    });

    const response = await this.intentAggregaterClient.sendIntent(
      this.intent,
      signedTx
    );

    if (response.status === 'success') {
      logWithLabel({
        labelText: `${this.intent.source}Filler:fillIntentWithIntentAggregater`,
        level: 'info',
        message: `Transaction successful`,
      });
    } else {
      logWithLabel({
        labelText: `${this.intent.source}Filler:fillIntentWithIntentAggregater`,
        level: 'warn',
        message: `Transaction failed`,
      });
    }
  }

  private async simulateTransaction(txParams: any, chainConfig: ChainConfig) {
    try {
      logWithLabel({
        labelText: `${this.intent.source}Filler:simulateTransaction`,
        level: 'info',
        message: `Simulating transaction...`,
      });

      const gasUsed = await chainConfig.publicClient.estimateGas(txParams);

      logWithLabel({
        labelText: `${this.intent.source}Filler:simulateTransaction`,
        level: 'info',
        message: `Simulation successful`,
      });

      return gasUsed;
    } catch (error) {
      logWithLabel({
        labelText: `${this.intent.source}Filler:simulateTransaction`,
        level: 'warn',
        message: `Simulation failed: ${error}`,
      });
    }
  }

  protected createTransaction(
    fillData: FillRequest,
    gasInfo: GasInfo,
    chainConfig: ChainConfig
  ) {
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

    if (gasInfo.gasUsed !== BigInt(0)) {
      txParams = {
        ...txParams,
        gas: gasInfo.gasUsed * BigInt(2),
      };
    }

    return txParams;
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

  protected async calculateGasFee(
    fillData: FillRequest,
    chainConfig: ChainConfig,
    defaultGasUsed: bigint
  ): Promise<GasInfo | null> {
    return {
      gasUsed: BigInt(0),
      gasPrice: BigInt(0),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };
  }
}
