import { Config } from '../config';
import { WethRebalancer } from './weth';

const runRebalancer = async (config: Config) => {
  const wethRebalancer = new WethRebalancer(config);
  await wethRebalancer.rebalance();
};

export default runRebalancer;
