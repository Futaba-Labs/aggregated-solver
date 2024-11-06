import { parseUnits } from 'viem';

import { IntentAggregaterClient } from '../../clients';
import {
  ChainConfig,
  Config,
  fetchDstChainFilter,
  fetchTokenConfig,
} from '../../config';
import { FillRequest, Intent } from '../../types';
import { logWithLabel } from '../../utils';
import { BaseFiller, GasInfo } from './baseFiller';

export abstract class CustomGasFiller<T> extends BaseFiller<T> {
  constructor(
    intent: Intent<string, T>,
    config: Config,
    intentAggregaterClient: IntentAggregaterClient
  ) {
    super(intent, config, intentAggregaterClient);
  }

  protected override async calculateGasFee(
    fillData: FillRequest,
    chainConfig: ChainConfig,
    defaultGasUsed: bigint
  ) {
    let gasInfo = {
      gasUsed: BigInt(0),
      gasPrice: BigInt(0),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };
    const relayerFee = await this.calculateRelayerFee();

    // if the relayer fee is less than 0, it means the fee is not enough to cover the gas fee
    if (relayerFee < 0) {
      return null;
    }

    // fetch relayer fee percentage
    const relayerFeePct = this.fetchRelayerFeePct();

    if (relayerFeePct === 0 || !relayerFeePct) {
      return {
        gasUsed: BigInt(0),
        gasPrice: BigInt(0),
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0),
      };
    }

    // calculate gas used
    const txParams = this.createTransaction(fillData, gasInfo, chainConfig);

    let gasUsed = BigInt(0);
    try {
      gasUsed = await chainConfig.publicClient.estimateGas(txParams);
      gasUsed = BigInt(Math.ceil(Number(gasUsed) * 0.92));
    } catch (error) {
      logWithLabel({
        labelText: 'CustomGasFiller:calculateGasFee',
        level: 'warn',
        message: `Error estimating gas: ${error}`,
      });
      gasUsed = defaultGasUsed;
    }

    // calculate gas price
    const gasPrice = BigInt(
      Math.ceil(Number((relayerFee * relayerFeePct) / Number(gasUsed)))
    );

    if (!this.useEip1559()) {
      gasInfo.gasPrice = gasPrice;
      gasInfo.gasUsed = gasUsed;

      logWithLabel({
        labelText: 'CustomGasFiller:calculateGasFee',
        level: 'info',
        message: `Gas info: ${JSON.stringify(gasInfo, (_, v) =>
          typeof v === 'bigint' ? v.toString() : v
        )}`,
      });
      return gasInfo;
    }

    // fetch base fee
    // TODO: need to predict the base fee
    const latestBlock = await chainConfig.publicClient.getBlock({
      blockTag: 'latest',
    });
    const baseFee = latestBlock.baseFeePerGas;

    if (!baseFee) {
      return {
        gasPrice,
        gasUsed,
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0),
      };
    }

    // calculate max priority fee and max fee per gas
    const maxPriorityFeePerGas = gasPrice - baseFee;
    const maxFeePerGas = baseFee * BigInt(2) + maxPriorityFeePerGas;

    gasInfo.gasPrice = gasPrice;
    gasInfo.gasUsed = gasUsed;
    gasInfo.maxFeePerGas = maxFeePerGas;
    gasInfo.maxPriorityFeePerGas = maxPriorityFeePerGas;

    logWithLabel({
      labelText: 'AcrossFiller:calculateGasFee',
      level: 'info',
      message: `Gas info: ${JSON.stringify(gasInfo, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )}`,
    });

    return gasInfo;
  }

  private useEip1559() {
    const dstChainConfig = fetchDstChainFilter(
      this.intent.source,
      this.intent.output.chainId
    );

    return dstChainConfig.eip1559;
  }

  private fetchRelayerFeePct() {
    const tokenConfig = fetchTokenConfig(
      this.intent.source.toLowerCase(),
      this.intent.output.chainId,
      this.intent.output.tokenAddress as `0x${string}`
    );

    const thresholdAmount = Object.keys(tokenConfig.relayerFeePct)
      .map(Number)
      .sort((a, b) => a - b)
      .reverse()
      .find(
        (threshold) =>
          BigInt(this.intent.input.amount) >=
          BigInt(parseUnits(threshold.toString(), tokenConfig.decimals))
      );

    if (!thresholdAmount) {
      return 0;
    }

    const relayerFeePct =
      tokenConfig.relayerFeePct[
        thresholdAmount.toString() as keyof typeof tokenConfig.relayerFeePct
      ];

    logWithLabel({
      labelText: 'AcrossFiller:fetchRelayerFeePct',
      level: 'info',
      message: `Relayer fee pct: ${relayerFeePct}`,
    });

    return relayerFeePct;
  }

  protected abstract calculateRelayerFee(): Promise<number>;
}
