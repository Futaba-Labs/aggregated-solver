import { ChainConfig, Config, getChainConfig } from '../config';
import { Intent } from '../types';

export abstract class BaseSettler<T> {
  protected chainConfig: ChainConfig;

  constructor(
    protected readonly config: Config,
    protected readonly intent: Intent<string, T>
  ) {
    this.chainConfig = getChainConfig(config, intent.output.chainId);
  }

  abstract settleIntent(): Promise<void>;
  abstract settleBatchIntents(): Promise<void>;
}
