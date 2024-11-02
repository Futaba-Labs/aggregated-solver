import { IntentAggregaterClient } from '../clients';
import { Config, ProtocolConfig } from '../config/config';
import { Intent } from '../types';
import { checkEnoughAllowance, logWithLabel } from '../utils';
import { customFilter } from './filter';
import { IntentFetcher } from './intentFetcher';
import { IntentFiller } from './intentFiller';

const runRelayer = async (config: Config) => {
  for (const protocol of config.protocols) {
    await checkAllowance(config, protocol);

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

const checkAllowance = async (config: Config, protocol: ProtocolConfig) => {
  logWithLabel({
    labelText: 'relayer:checkAllowance',
    level: 'info',
    message: `Checking allowance for protocol ${protocol.name}...`,
  });
  for (const chain of protocol.intentFilter.dstChains) {
    const chainConfig = config.common.chains.find(
      (c) => c.chainId === chain.chainId
    );
    if (!chainConfig) {
      throw new Error(`Chain ${chain.chainId} not found`);
    }
    for (const token of chain.supportTokens) {
      await checkEnoughAllowance(
        token.address,
        chain.fillContract,
        chainConfig
      );
    }
  }
  logWithLabel({
    labelText: 'relayer:checkAllowance',
    level: 'info',
    message: `Checking allowance for protocol ${protocol.name}... done`,
  });
};

export default runRelayer;
