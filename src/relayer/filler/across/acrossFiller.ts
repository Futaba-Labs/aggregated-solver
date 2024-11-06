import * as sdk from '@across-protocol/sdk-v2';
import { BigNumber, ethers } from 'ethers';
import { PublicClient, createPublicClient, http, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';

import { IntentAggregaterClient } from '../../../clients';
import { ChainConfig, Config, fetchTokenConfig } from '../../../config/config';
import env from '../../../config/env';
import { AcrossMetadata, FillRequest, Intent } from '../../../types';
import { logWithLabel } from '../../../utils';
import { BaseFiller } from '../baseFiller';
import {
  ACROSS_CONFIG_STORE_ABI,
  ACROSS_CONFIG_STORE_ADDRESS,
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
      gasLimit: BigInt(0),
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
        gasLimit: BigInt(0),
        gasPrice: BigInt(0),
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0),
      };
    }

    // calculate gas used
    const txParams = this.createTransaction(fillData, gasInfo, chainConfig);
    let gasUsed = await chainConfig.publicClient.estimateGas(txParams);
    gasUsed = BigInt(Math.ceil(Number(gasUsed) * 0.92));

    // calculate gas price
    const gasPrice = BigInt(
      Math.ceil(Number((relayerFee * relayerFeePct) / Number(gasUsed)))
    );

    // fetch base fee
    // TODO: need to predict the base fee
    const latestBlock = await chainConfig.publicClient.getBlock({
      blockTag: 'latest',
    });
    const baseFee = latestBlock.baseFeePerGas;

    if (!baseFee) {
      return {
        gasPrice,
        gasLimit: gasUsed,
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0),
      };
    }

    // calculate max priority fee and max fee per gas
    const maxPriorityFeePerGas = gasPrice - baseFee;
    const maxFeePerGas = baseFee * BigInt(2) + maxPriorityFeePerGas;

    gasInfo.gasPrice = gasPrice;
    gasInfo.gasLimit = gasUsed;
    gasInfo.maxFeePerGas = maxFeePerGas;
    gasInfo.maxPriorityFeePerGas = maxPriorityFeePerGas;

    logWithLabel({
      labelText: 'AcrossFiller:calculateGasFee',
      level: 'info',
      message: `Gas info: ${JSON.stringify(gasInfo)}`,
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
      this.intent.output.tokenAddress
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
    const inputAmout = BigNumber.from(this.intent.input.amount);
    const outputAmount = BigNumber.from(this.intent.output.amount);

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

  // TODO: convert outputToken to L1 token address
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
      this.intent.input.chainId,
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

    return tokenConfig.relayerFeePct[
      thresholdAmount.toString() as keyof typeof tokenConfig.relayerFeePct
    ];
  }
}
