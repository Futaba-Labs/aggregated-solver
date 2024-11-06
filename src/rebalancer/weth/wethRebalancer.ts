import { formatEther } from 'viem';

import { ChainConfig, Config, WrapConfig, getChainConfig } from '../../config';
import { logWithLabel } from '../../utils';
import { WETH_ABI } from './constants';

export class WethRebalancer {
  private readonly wrapConfigs: WrapConfig[];

  constructor(private readonly config: Config) {
    this.wrapConfigs = config.rebalance.wrap;
  }

  async rebalance() {
    for (const wrapConfig of this.wrapConfigs) {
      setInterval(async () => {
        logWithLabel({
          labelText: `rebalancer:weth:${wrapConfig.chainId}`,
          level: 'info',
          message: `Rebalancing WETH: ${JSON.stringify(wrapConfig)}`,
        });
        await this.rebalanceETH(wrapConfig);
      }, wrapConfig.interval);
    }
  }

  private async rebalanceETH(wrapConfig: WrapConfig) {
    const chainConfig = getChainConfig(this.config, wrapConfig.chainId);

    const ethBalance = await chainConfig.publicClient.getBalance({
      address: this.config.common.relayerAddress,
    });

    logWithLabel({
      labelText: `rebalancer:weth:${wrapConfig.chainId}`,
      level: 'info',
      message: `ETH balance: ${formatEther(ethBalance)}`,
    });

    const wethBalance = (await chainConfig.publicClient.readContract({
      address: wrapConfig.address,
      abi: WETH_ABI,
      functionName: 'balanceOf',
      args: [this.config.common.relayerAddress],
    })) as bigint;

    logWithLabel({
      labelText: `rebalancer:weth:${wrapConfig.chainId}`,
      level: 'info',
      message: `WETH balance: ${formatEther(wethBalance)}`,
    });

    // Target ratio
    const totalBalance = ethBalance + wethBalance;
    const targetEth = (Number(totalBalance) * (1 - wrapConfig.wethPct)) / 100;

    const lowerBoundEth = (targetEth * (1 - wrapConfig.allowancePct)) / 100;
    const upperBoundEth = (targetEth * (1 + wrapConfig.allowancePct)) / 100;

    let req;
    if (ethBalance < lowerBoundEth) {
      const amountToUnwrap = BigInt(Math.ceil(targetEth)) - ethBalance;
      req = await this.simulate(
        chainConfig,
        wrapConfig,
        'deposit',
        amountToUnwrap
      );
    } else if (ethBalance > upperBoundEth) {
      const amountToWrap = ethBalance - BigInt(Math.ceil(targetEth));
      req = await this.simulate(
        chainConfig,
        wrapConfig,
        'withdraw',
        amountToWrap
      );
    }

    if (req) {
      const hash = await chainConfig.walletClient.writeContract(req);

      const transaction =
        await chainConfig.publicClient.waitForTransactionReceipt({ hash });

      if (transaction.status === 'success') {
        logWithLabel({
          labelText: `rebalancer:weth:${wrapConfig.chainId}`,
          level: 'info',
          message: `Transaction successful: ${hash}`,
        });
      } else {
        logWithLabel({
          labelText: `rebalancer:weth:${wrapConfig.chainId}`,
          level: 'warn',
          message: `Transaction failed: ${hash}`,
        });
      }
    } else {
      logWithLabel({
        labelText: `rebalancer:weth:${wrapConfig.chainId}`,
        level: 'info',
        message: 'No action needed',
      });
    }
  }

  private async simulate(
    chainConfig: ChainConfig,
    wrapConfig: WrapConfig,
    functionName: 'deposit' | 'withdraw',
    amount: bigint
  ) {
    const { request } = await chainConfig.publicClient.simulateContract({
      account: chainConfig.walletClient.account,
      address: wrapConfig.address,
      abi: WETH_ABI,
      functionName: functionName,
      value: functionName === 'deposit' ? amount : undefined,
      args: functionName === 'withdraw' ? [amount] : undefined,
    });

    return request;
  }
}
