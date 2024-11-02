import { loadConfig } from './config/config';
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
};

main();
