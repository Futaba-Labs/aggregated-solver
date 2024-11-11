import { loadConfig } from './config/config';
import runRebalancer from './rebalancer';
import runRelayer from './relayer';
import { logWithLabel } from './utils';

const main = () => {
  const config = loadConfig();

  logWithLabel({
    labelText: 'relayer',
    level: 'info',
    message: 'Starting relayer...',
  });
  runRelayer(config);

  // logWithLabel({
  //   labelText: 'rebalancer',
  //   level: 'info',
  //   message: 'Starting rebalancer...',
  // });
  // runRebalancer(config);
};

main();
