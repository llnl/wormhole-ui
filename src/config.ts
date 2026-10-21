import { Config } from './models/Config';
import { TokenServiceConfigRepository } from './repositories/TokenServiceConfigRepository';

const tokenServiceConfigRepo = new TokenServiceConfigRepository();

let config: Config | null = null;

export const loadConfig = async (): Promise<void> => {
  const tokenService = await tokenServiceConfigRepo.getConfig();
  config = new Config({ tokenService });
};

export const getConfig = (): Config => {
  if (config === null) {
    throw new Error('The config was read before it finished loading.');
  }
  return config;
};
