import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  webSocket,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import CONFIG from '../../config.json';
import { logWithLabel } from '../utils/logger';
import { CHAIN_IDs } from './constants';
import env, { RPC_PROVIDER } from './env';


export interface Config {
  common: CommonConfig;
  protocols: ProtocolConfig[];
}

export interface CommonConfig {
  relayerAddress: Address;
  chains: ChainConfig[];
}

export interface ChainConfig {
  chainId: CHAIN_IDs;
  publicClient: PublicClient;
  walletClient: WalletClient;
};

export interface ProtocolConfig {
  simulate: boolean;
  name: string;
  intentFilter: IntentFilter;
  rebalance: RebalanceConfig;
  settlement: SettlementConfig;
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
  fullContract: Address;
}

export type Token = {
  address: Address;
  symbol: string;
  decimals: number;
  minAmount: number;
  maxAmount: number;
  relayerFeePct: {
    [key: string]: number;
  };
};

export interface RebalanceConfig {
  wrap: WrapConfig[];
  singleChain: [];
  crossChain: [];
}

export interface WrapConfig {
  chainId: CHAIN_IDs;
  wethPct: number;
  allowancePct: number;
  interval: number;
}

export interface SettlementConfig {
  interval: number;
}

export const account = privateKeyToAccount(
  env.PRIVATE_KEY as `0x${string}`
);

export function loadConfig(): Config {
  // fetch chains from config
  const chains: ChainConfig[] = []
  CONFIG.forEach((config) => {
    config.srcChains.map((chain) => {
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

  CONFIG.forEach((config) => {
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
        fullContract: chain.fullContract as Address,
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

    // set rebalance
    const rebalance: RebalanceConfig = {
      wrap: config.rebalance.wrap,
      singleChain: [],
      crossChain: [],
    };

    // set settlement
    const settlement: SettlementConfig = {
      interval: config.settlement.interval,
    };

    protocols.push({
      name: config.name,
      simulate: config.simulate,
      intentFilter: { srcChains: srcChainFilter, dstChains: dstChainFilter },
      rebalance,
      settlement,
    });
  });

  const config =
  {
    common: {
      relayerAddress: account.address,
      chains,
    },
    protocols
  };

  logWithLabel({
    labelText: 'config',
    level: 'info',
    message: JSON.stringify(config, null, 2),
  });

  return config;
}