import { Config } from './models/Config';
import type { UiConfig } from './models/UiConfig';
import { TokenServiceConfigRepository } from './repositories/TokenServiceConfigRepository';
import { UiConfigRepository } from './repositories/UiConfigRepository';

const uiConfigRepo = new UiConfigRepository();
const tokenServiceConfigRepo = new TokenServiceConfigRepository();

let uiConfig: UiConfig | null = null;
let config: Config | null = null;

export const loadConfig = async (): Promise<void> => {
  uiConfig = await uiConfigRepo.getConfig();
  const tokenService = await tokenServiceConfigRepo.getConfig();
  config = new Config({ ui: uiConfig, tokenService });
};

export const getUiConfig = (): UiConfig => {
  if (uiConfig === null) {
    throw new Error('The UI config was read before it finished loading.');
  }
  return uiConfig;
};

export const getConfig = (): Config => {
  if (config === null) {
    throw new Error('The config was read before it finished loading.');
  }
  return config;
};
