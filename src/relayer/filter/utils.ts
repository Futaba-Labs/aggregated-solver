import { Config } from '../../config/config';
import { AcrossMetadata, Intent } from '../../types';
import { AcrossFilter } from './across';
import { BaseFilter } from './baseFilter';

export const intentFilter = async (
  intent: Intent,
  config: Config
): Promise<boolean> => {
  let filter: BaseFilter<any>;
  if (intent.source.toLowerCase() === 'across') {
    filter = new AcrossFilter(
      intent as Intent<'across', AcrossMetadata>,
      config
    );
  } else {
    filter = new BaseFilter(config, intent);
  }

  return filter.filter();
};
