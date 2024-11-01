import { Config } from '../../config/config';
import { CustomFilter, Intent } from '../../types';
import { AcrossFilter, AcrossMetadata } from './acrossFilter';
import { BaseFilter } from './baseFilter';

export const customFilter = async (
  intent: Intent,
  config: Config
): Promise<boolean> => {
  let filter: BaseFilter;
  if (intent.source === 'across') {
    filter = new AcrossFilter(
      intent as Intent<'across', AcrossMetadata>,
      config
    );
  } else {
    filter = new BaseFilter(config, intent);
  }

  return filter.filter();
};
