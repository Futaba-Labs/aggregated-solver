import { Address, erc20Abi, parseEther } from 'viem';

import { ChainConfig } from '../config/config';

export const checkEnoughAllowance = async (
  tokenAddress: Address,
  spenderAddress: Address,
  chain: ChainConfig
) => {
  const allowance = await chain.publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [chain.walletClient.account!.address, spenderAddress],
  });

  if (allowance < 0) {
    await approveToken(tokenAddress, spenderAddress, chain);
  }
};

export const approveToken = async (
  tokenAddress: Address,
  spenderAddress: Address,
  chain: ChainConfig
) => {
  const { request } = await chain.publicClient.simulateContract({
    account: chain.walletClient.account,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, parseEther('100000')],
  });

  await chain.walletClient.writeContract(request);
};
