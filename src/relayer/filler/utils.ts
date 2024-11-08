import { IntentAggregaterClient } from '../../clients';
import { Config } from '../../config';
import { BaseSettler, DebridgeSettler } from '../../settler';
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
  let settler: BaseSettler<any>;
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
    settler = new DebridgeSettler(
      config,
      intent as Intent<'debridge', DeBridgeFillOrderMetadata>
    );
  } else {
    filler = new BaseFiller(intent, config, intentAggregaterClient);
  }

  return async () => {
    await filler.fillIntent();
    if (settler) {
      await settler.settleIntent();
    }
  };
};
