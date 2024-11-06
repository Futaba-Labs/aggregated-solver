import { Address, Hex } from 'viem';

export interface DeBridgeOrder {
  makerOrderNonce: bigint;
  makerSrc: Address;
  giveChainId: bigint;
  giveTokenAddress: Address;
  giveAmount: bigint;
  takeChainId: bigint;
  takeTokenAddress: Address;
  takeAmount: bigint;
  receiverDst: Address;
  givePatchAuthoritySrc: Address;
  orderAuthorityAddressDst: Address;
  allowedTakerDst: Address;
  allowedCancelBeneficiarySrc: Address;
  externalCall: Hex;
}

export interface DeBridgeFillOrderMetadata {
  order: DeBridgeOrder;
  orderId: string;
  sender: Address;
  unlockAuthority: Address;
}
