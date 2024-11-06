import { Config } from '../../config/config';
import { Intent } from '../../types';

export class BaseFilter<T> {
  constructor(
    readonly config: Config,
    readonly intent: Intent<string, T>
  ) {}

  async filter(): Promise<boolean> {
    if (this.intent.deadline && this.intent.deadline < Date.now() / 1000) {
      return false;
    }
    return true;
  }
}
