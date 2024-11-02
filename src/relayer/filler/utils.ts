import { AcrossFiller } from ".";
import { IntentAggregaterClient } from "../../clients";
import { Config } from "../../config";
import { Intent, AcrossMetadata } from "../../types";
import { BaseFiller } from "./baseFiller";

export const intentFiller = async (
  intent: Intent,
  config: Config,
  intentAggregaterClient: IntentAggregaterClient
) => {
  let filler: BaseFiller;
  if (intent.source === 'across') {
    filler = new AcrossFiller(
      intent as Intent<'across', AcrossMetadata>,
      config,
      intentAggregaterClient
    );
  } else {
    filler = new BaseFiller(intent, config, intentAggregaterClient);
  }

  return filler.fillIntent();
};