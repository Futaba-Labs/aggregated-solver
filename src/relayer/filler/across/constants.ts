import acrossConfigStoreAbi from './abi/AcrossConfigStore.json';
import hubPoolAbi from './abi/HubPool.json';
import spokePoolAbi from './abi/SpokePool.json';

export const HUB_POOL_ADDRESS = '0xc186fA914353c44b2E33eBE05f21846F1048bEda';
export const ACROSS_CONFIG_STORE_ADDRESS =
  '0x3B03509645713718B78951126E0A6de6f10043f5';

export const SPOKE_POOL_ABI = spokePoolAbi;
export const HUB_POOL_ABI = hubPoolAbi;
export const ACROSS_CONFIG_STORE_ABI = acrossConfigStoreAbi;
export const DEFAULT_GAS_USED = BigInt(110000);

export const L1_TOKEN_ADDRESS = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};
