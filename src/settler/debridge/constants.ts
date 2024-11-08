import { parseEther } from 'viem';

import { CHAIN_IDs } from '../../config';
import dlnDstAbi from './abi/DeBridgeDestination.json';

export const DEBRIDGE_DST_ABI = dlnDstAbi;

export const DEBRIDGE_ADDRESSES: Record<string, `0x${string}`> = {
  src: '0xeF4fB24aD0916217251F553c0596F8Edc630EB66',
  dst: '0xe7351fd770a37282b91d153ee690b63579d6dd7f',
};

export const DEBRIDGE_MESSAGING_FEE: Record<string, bigint> = {
  [CHAIN_IDs.MAINNET]: parseEther('0.001'),
  [CHAIN_IDs.BASE]: parseEther('0.001'),
  [CHAIN_IDs.ARBITRUM]: parseEther('0.001'),
  [CHAIN_IDs.OPTIMISM]: parseEther('0.001'),
  [CHAIN_IDs.POLYGON]: parseEther('0.5'),
  [CHAIN_IDs.LINEA]: parseEther('0.001'),
  [CHAIN_IDs.AVALANCHE]: parseEther('0.05'),
  [CHAIN_IDs.BNB]: parseEther('0.005'),
};
