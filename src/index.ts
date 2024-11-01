import { loadConfig } from './config/config';
import runRelayer from './relayer';
import { logWithLabel } from './utils/logger';

const main = async () => {
  const config = loadConfig();

  logWithLabel({
    labelText: 'relayer',
    level: 'info',
    message: 'Starting relayer...',
  });
  await runRelayer(config);
};

main();
