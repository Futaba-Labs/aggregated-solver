import { Config } from "../../config/config";
import { AcrossMetadata, Intent } from "../../types";
import { BaseFiller } from "./baseFiller";
import { IntentAggregaterClient } from "../../clients";

export class AcrossFiller extends BaseFiller {
  constructor(
    intent: Intent<'across', AcrossMetadata>,
    config: Config,
    intentAggregaterClient: IntentAggregaterClient
  ) {
    super(intent, config, intentAggregaterClient);
  }

  protected override async calculateGasFee() {
    return {
      gasLimit: BigInt(0),
      gasPrice: BigInt(0),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };
  }

  private async calculateRelayerFee() {
    return BigInt(0);
  }
}
