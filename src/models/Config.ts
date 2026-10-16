import { AbstractModel } from './AbstractModel';
import type { TokenServiceConfig } from './TokenServiceConfig';

interface ConfigSections {
  tokenService: TokenServiceConfig;
}

export class Config extends AbstractModel {
  readonly tokenService: TokenServiceConfig;

  constructor(sections: ConfigSections) {
    super();
    this.tokenService = sections.tokenService;
    Object.freeze(this);
  }
}
