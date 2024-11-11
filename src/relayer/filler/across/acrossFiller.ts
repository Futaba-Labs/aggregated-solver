import * as sdk from '@across-protocol/sdk-v2';
import { BigNumber, ethers } from 'ethers';
import { PublicClient, createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

import { CustomGasFiller, GasInfo } from '..';
import { IntentAggregaterClient } from '../../../clients';
import { ChainConfig, Config, fetchTokenConfig } from '../../../config/config';
import env from '../../../config/env';
import { AcrossMetadata, FillRequest, Intent } from '../../../types';
import { logWithLabel } from '../../../utils';
import {
  ACROSS_CONFIG_STORE_ABI,
  ACROSS_CONFIG_STORE_ADDRESS,
  DEFAULT_GAS_USED,
  HUB_POOL_ABI,
  HUB_POOL_ADDRESS,
  L1_TOKEN_ADDRESS,
} from './constants';

export class AcrossFiller extends CustomGasFiller<AcrossMetadata> {
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

  protected override async calculateRelayerFee() {
    // 1. find the closest block by timestamp
    const closestBlock = await this.findClosestBlockByTimestamp(
      this.intent.metadata.quoteTimestamp
    );

    const tokenConfig = fetchTokenConfig(
      this.intent.source.toLowerCase(),
      this.intent.output.chainId,
      this.intent.output.tokenAddress as `0x${string}`
    );

    const l1TokenAddress =
      L1_TOKEN_ADDRESS[tokenConfig.symbol as keyof typeof L1_TOKEN_ADDRESS];

    // 2. multi call to get the current and next liquidity utilization and the L1 token config
    const [currentUt, nextUt, rawL1TokenConfig] = await this.multiCall(
      this.intent.input.amount,
      closestBlock,
      l1TokenAddress
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

  protected override calculateGasFee(
    fillData: FillRequest,
    chainConfig: ChainConfig,
    defaultGasUsed: bigint
  ): Promise<GasInfo | null> {
    return super.calculateGasFee(fillData, chainConfig, DEFAULT_GAS_USED);
  }
}
