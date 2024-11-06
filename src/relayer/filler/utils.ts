import { IntentAggregaterClient } from '../../clients';
import { Config } from '../../config';
import { AcrossMetadata, DeBridgeFillOrderMetadata, Intent } from '../../types';
import { AcrossFiller } from './across';
import { BaseFiller } from './baseFiller';
import { DebridgeFiller } from './debridge/debridgeFiller';

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
  } else if (intent.source.toLowerCase() === 'debridge') {
    filler = new DebridgeFiller(
      intent as Intent<'debridge', DeBridgeFillOrderMetadata>,
      config,
      intentAggregaterClient
    );
  } else {
    filler = new BaseFiller(intent, config, intentAggregaterClient);
  }

  return filler.fillIntent();
};
