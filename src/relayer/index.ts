import { Config, getChainConfig, ProtocolConfig } from '../config/config';
import { checkEnoughAllowance, logWithLabel } from '../utils';
import { intentFiller } from './filler';
import { intentFilter } from './filter';
import { IntentFetcher } from './intentFetcher';

const runRelayer = async (config: Config) => {
  for (const protocol of config.protocols) {
    await checkAllowance(config, protocol);

    const intentFetcher = new IntentFetcher(protocol, config);
    intentFetcher.subscribeIntent(intentFiller, intentFilter);
  }
};

const checkAllowance = async (config: Config, protocol: ProtocolConfig) => {
  logWithLabel({
    labelText: 'relayer:checkAllowance',
    level: 'info',
    message: `Checking allowance for protocol ${protocol.name}...`,
  });
  for (const chain of protocol.intentFilter.dstChains) {
    const chainConfig = getChainConfig(config, chain.chainId);
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
