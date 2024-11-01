import { IntentAggregaterClient } from '../clients';
import { Config, ProtocolConfig } from '../config/config';
import { CustomFilter, IntentExecution } from '../types';

export class IntentFetcher {
  private readonly intentAggregaterClient: IntentAggregaterClient;

  constructor(protocol: ProtocolConfig, config: Config) {
    this.intentAggregaterClient = new IntentAggregaterClient(
      protocol.intentFilter,
      config
    );
  }

  subscribeIntent(onEvent: IntentExecution, filter: CustomFilter) {
    this.intentAggregaterClient.subscribeIntent(onEvent, filter);
  }

  async fetchIntent() {
    return await this.intentAggregaterClient.fetchIntent();
  }
}
