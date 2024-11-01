import { IntentAggregaterClient } from '../clients';
import { Config } from '../config/config';
import { Intent } from '../types';
import { customFilter } from './filter';
import { IntentFetcher } from './intentFetcher';
import { IntentFiller } from './intentFiller';

const runRelayer = async (config: Config) => {
  for (const protocol of config.protocols) {
    const onEvent = async (
      intent: Intent,
      config: Config,
      client: IntentAggregaterClient
    ) => {
      const intentFiller = new IntentFiller(intent, config, client);
      await intentFiller.fillIntent();
    };

    const intentFetcher = new IntentFetcher(protocol, config);
    intentFetcher.subscribeIntent(onEvent, customFilter);
  }
};

export default runRelayer;
