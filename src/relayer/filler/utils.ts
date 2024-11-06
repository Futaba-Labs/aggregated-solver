import { IntentAggregaterClient } from '../../clients';
import { Config } from '../../config';
import { AcrossMetadata, Intent } from '../../types';
import { AcrossFiller } from './across';
import { BaseFiller } from './baseFiller';

export const intentFiller = async (
  intent: Intent,
  config: Config,
  intentAggregaterClient: IntentAggregaterClient
) => {
  let filler: BaseFiller<any>;
  if (intent.source.toLowerCase() === 'across') {
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
