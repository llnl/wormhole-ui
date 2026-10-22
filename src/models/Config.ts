import { AbstractModel } from './AbstractModel';
import type { TokenServiceConfig } from './TokenServiceConfig';
import type { UiConfig } from './UiConfig';

interface ConfigSections {
  ui: UiConfig;
  tokenService: TokenServiceConfig;
}

export class Config extends AbstractModel {
  readonly ui: UiConfig;
  readonly tokenService: TokenServiceConfig;

  constructor(sections: ConfigSections) {
    super();
    this.ui = sections.ui;
    this.tokenService = sections.tokenService;
    Object.freeze(this);
  }
}
