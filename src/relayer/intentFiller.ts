import { IntentAggregaterClient } from '../clients';
import { Config } from '../config/config';
import { Intent } from '../types/intent';

export class IntentFiller {
  constructor(
    private readonly intent: Intent,
    private readonly config: Config,
    private readonly intentAggregaterClient: IntentAggregaterClient
  ) {}

  async fillIntent() {
    console.log(this.intent);
  }
}
