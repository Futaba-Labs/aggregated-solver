import {
  Address,
  PublicClient,
  WalletClient,
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum } from 'viem/chains';

import CONFIG from '../../config.json';
import { logWithLabel } from '../utils';
import { CHAIN_IDs } from './constants';
import env, { RPC_PROVIDER } from './env';

export interface Config {
  common: CommonConfig;
  protocols: ProtocolConfig[];
  rebalance: RebalanceConfig;
  settlement: SettlementConfig;
}

export interface CommonConfig {
  relayerAddress: Address;
  chains: ChainConfig[];
}

export interface ChainConfig {
  chainId: CHAIN_IDs;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export interface ProtocolConfig {
  simulate: boolean;
  name: string;
  intentFilter: IntentFilter;
}

export interface IntentFilter {
  srcChains: SrcChainFilter[];
  dstChains: DstChainFilter[];
}

export interface SrcChainFilter {
  chainId: CHAIN_IDs;
  confirmation: {
    [key: string]: number | undefined;
  };
}

export interface DstChainFilter {
  chainId: CHAIN_IDs;
  supportTokens: Token[];
  fillContract: Address;
  useIntentAggregater: boolean;
  eip1559: boolean;
}

export type Token = {
  address: Address;
  symbol: string;
  decimals: number;
  minAmount: number;
  maxAmount: number;
  relayerFeePct: {
    [key: string]: number | undefined;
  };
};

export interface RebalanceConfig {
  wrap: WrapConfig[];
  singleChain: [];
  crossChain: [];
}

export interface WrapConfig {
  chainId: CHAIN_IDs;
  address: Address;
  wethPct: number;
  allowancePct: number;
  interval: number;
}

export interface SettlementConfig {
  interval: number;
}

export const account = privateKeyToAccount(env.PRIVATE_KEY as `0x${string}`);

export function loadConfig(): Config {
  // fetch chains from config
  const chains: ChainConfig[] = [];
  CONFIG.protocols.forEach((config) => {
    config.srcChains.map((chain) => {
      const rpcUrl = env[`RPC_PROVIDER_${chain.chainId}` as keyof RPC_PROVIDER];
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
      });
      const walletClient = createWalletClient({
        account,
        chain: arbitrum,
        transport: http(rpcUrl),
      });
      if (!chains.find((c) => c.chainId === chain.chainId)) {
        chains.push({
          chainId: chain.chainId,
          publicClient,
          walletClient,
        });
      }
    });

    config.dstChains.map((chain) => {
      const rpcUrl = env[`RPC_PROVIDER_${chain.chainId}` as keyof RPC_PROVIDER];
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
      });
      const walletClient = createWalletClient({
        account,
        transport: http(rpcUrl),
      });
      if (!chains.find((c) => c.chainId === chain.chainId)) {
        chains.push({
          chainId: chain.chainId,
          publicClient,
          walletClient,
        });
      }
    });
  });

  // fetch protocols from config
  const protocols: ProtocolConfig[] = [];

  CONFIG.protocols.forEach((config) => {
    // set intent filter
    const srcChainFilter: SrcChainFilter[] = [];
    config.srcChains.map((chain) => {
      srcChainFilter.push({
        chainId: chain.chainId,
        confirmation: chain.confirmation,
      });
    });

    const dstChainFilter: DstChainFilter[] = [];
    config.dstChains.map((chain) => {
      dstChainFilter.push({
        chainId: chain.chainId,
        fillContract: chain.fillContract as Address,
        useIntentAggregater: chain.useIntentAggregater,
        eip1559: chain.eip1559,
        supportTokens: chain.supportTokens.map((token) => ({
          address: token.address as Address,
          symbol: token.symbol,
          decimals: token.decimals,
          minAmount: token.minAmount,
          maxAmount: token.maxAmount,
          relayerFeePct: token.relayerFeePct,
        })),
      });
    });

    protocols.push({
      name: config.name.toLowerCase(),
      simulate: config.simulate,
      intentFilter: { srcChains: srcChainFilter, dstChains: dstChainFilter },
    });
  });

  // set rebalance
  const rebalance: RebalanceConfig = {
    wrap: CONFIG.rebalance.wrap.map((wrap) => ({
      ...wrap,
      address: wrap.address as Address,
    })),
    singleChain: [],
    crossChain: [],
  };

  // set settlement
  const settlement: SettlementConfig = {
    interval: CONFIG.settlement.interval,
  };

  const config = {
    common: {
      relayerAddress: account.address,
      chains,
    },
    protocols,
    rebalance,
    settlement,
  };

  logWithLabel({
    labelText: 'config',
    level: 'info',
    message: JSON.stringify(config, null, 2),
  });

  return config;
}

export const getChainConfig = (config: Config, chainId: CHAIN_IDs) => {
  const chainConfig = config.common.chains.find((c) => c.chainId === chainId);
  if (!chainConfig) {
    throw new Error(`Chain config not found for chainId: ${chainId}`);
  }
  return chainConfig;
};

export const fetchProtocolConfig = (protocol: string) => {
  const protocolConfig = CONFIG.protocols.find(
    (p) => p.name === protocol.toLowerCase()
  );
  if (!protocolConfig) {
    throw new Error(`Protocol not found: ${protocol}`);
  }
  return protocolConfig;
};

export const fetchDstChainFilter = (protocol: string, chainId: CHAIN_IDs) => {
  const protocolConfig = fetchProtocolConfig(protocol);
  const dstChainFilter = protocolConfig.dstChains.find(
    (c) => c.chainId === chainId
  );
  if (!dstChainFilter) {
    throw new Error(`Dst chain filter not found for chainId: ${chainId}`);
  }
  return dstChainFilter;
};

export const fetchTokenConfig = (
  protocol: string,
  chainId: CHAIN_IDs,
  tokenAddress: Address
) => {
  const dstChainFilter = fetchDstChainFilter(protocol, chainId);
  const tokenConfig = dstChainFilter.supportTokens.find(
    (t) => t.address === tokenAddress
  );
  if (!tokenConfig) {
    throw new Error(`Token config not found for tokenAddress: ${tokenAddress}`);
  }
  return tokenConfig;
};
