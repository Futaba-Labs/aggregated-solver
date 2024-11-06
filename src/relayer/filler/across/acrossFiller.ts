import * as sdk from '@across-protocol/sdk-v2';
import { BigNumber, ethers } from 'ethers';
import { PublicClient, createPublicClient, http, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';

import { IntentAggregaterClient } from '../../../clients';
import {
  ChainConfig,
  Config,
  fetchDstChainFilter,
  fetchTokenConfig,
} from '../../../config/config';
import env from '../../../config/env';
import { AcrossMetadata, FillRequest, Intent } from '../../../types';
import { logWithLabel } from '../../../utils';
import { BaseFiller } from '../baseFiller';
import {
  ACROSS_CONFIG_STORE_ABI,
  ACROSS_CONFIG_STORE_ADDRESS,
  DEFAULT_GAS_USED,
  HUB_POOL_ABI,
  HUB_POOL_ADDRESS,
} from './constants';

export class AcrossFiller extends BaseFiller<AcrossMetadata> {
  private readonly mainnetClient: PublicClient;
  constructor(
    intent: Intent<'across', AcrossMetadata>,
    config: Config,
    intentAggregaterClient: IntentAggregaterClient
  ) {
    super(intent, config, intentAggregaterClient);

    this.mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(env.RPC_PROVIDER_1),
    });
  }

  protected override async calculateGasFee(
    fillData: FillRequest,
    chainConfig: ChainConfig
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

    if (relayerFeePct === 0) {
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
        labelText: 'AcrossFiller:calculateGasFee',
        level: 'warn',
        message: `Error estimating gas: ${error}`,
      });
      gasUsed = DEFAULT_GAS_USED;
    }

    // calculate gas price
    const gasPrice = BigInt(
      Math.ceil(Number((relayerFee * relayerFeePct) / Number(gasUsed)))
    );

    if (!this.useEip1559()) {
      gasInfo.gasPrice = gasPrice;
      gasInfo.gasUsed = gasUsed;

      logWithLabel({
        labelText: 'AcrossFiller:calculateGasFee',
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

  private async calculateRelayerFee() {
    // 1. find the closest block by timestamp
    const closestBlock = await this.findClosestBlockByTimestamp(
      this.intent.metadata.quoteTimestamp
    );

    // 2. multi call to get the current and next liquidity utilization and the L1 token config
    const [currentUt, nextUt, rawL1TokenConfig] = await this.multiCall(
      this.intent.input.amount,
      closestBlock,
      this.intent.output.tokenAddress as `0x${string}`
    );

    const parsedL1TokenConfig =
      sdk.contracts.acrossConfigStore.Client.parseL1TokenConfig(
        String(rawL1TokenConfig.result)
      );
    const routeRateModelKey = `${this.intent.input.chainId}-${this.intent.output.chainId}`;
    const rateModel =
      parsedL1TokenConfig.routeRateModel?.[routeRateModelKey] ||
      parsedL1TokenConfig.rateModel;

    // 3. calculate the lp fee pct
    const lpFeePct = sdk.lpFeeCalculator.calculateRealizedLpFeePct(
      rateModel,
      BigNumber.from(currentUt.result),
      BigNumber.from(nextUt.result)
    );

    // 4. calculate the relayer fee
    const inputAmout = BigNumber.from(this.intent.input.amount.toString());
    const outputAmount = BigNumber.from(this.intent.output.amount.toString());

    const lpFeeTotal = inputAmout
      .mul(lpFeePct)
      .div(ethers.constants.WeiPerEther);
    const relayerFeeTotal = inputAmout.sub(outputAmount).sub(lpFeeTotal);
    const relayerFee = parseInt(relayerFeeTotal.toString());

    logWithLabel({
      labelText: 'AcrossFiller:calculateRelayerFee',
      level: 'info',
      message: `Relayer fee: ${relayerFee}`,
    });

    return relayerFee;
  }

  private async findClosestBlockByTimestamp(targetTimestamp: number) {
    const latestBlock = await this.mainnetClient.getBlock({
      blockTag: 'latest',
    });

    const timestampDiff = Number(latestBlock.timestamp) - targetTimestamp;

    const blockNumberDiff = Math.floor(timestampDiff / 12);

    return Number(latestBlock.number) - blockNumberDiff;
  }

  private async multiCall(
    inputAmount: bigint,
    blockNumber: number,
    outputToken: string
  ) {
    const hubPoolContract = {
      address: HUB_POOL_ADDRESS,
      abi: HUB_POOL_ABI,
    } as const;

    const acrossConfigStoreContract = {
      address: ACROSS_CONFIG_STORE_ADDRESS,
      abi: ACROSS_CONFIG_STORE_ABI,
    } as const;

    const results = await this.mainnetClient.multicall({
      contracts: [
        {
          ...hubPoolContract,
          functionName: 'liquidityUtilizationCurrent',
          args: [outputToken],
        },
        {
          ...hubPoolContract,
          functionName: 'liquidityUtilizationPostRelay',
          args: [outputToken, inputAmount],
        },
        {
          ...acrossConfigStoreContract,
          functionName: 'l1TokenConfig',
          args: [outputToken],
        },
      ],
      blockNumber: BigInt(blockNumber),
    });

    return results;
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

  private useEip1559() {
    const dstChainConfig = fetchDstChainFilter(
      this.intent.source,
      this.intent.output.chainId
    );

    return dstChainConfig.eip1559;
  }
}
