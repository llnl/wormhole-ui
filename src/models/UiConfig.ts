import { AbstractModel } from './AbstractModel';

export interface UiConfigSchema {
  tokenServiceUrl: string;
  routeRegistryUrl: string;
  loginUrl: string;
}

export class UiConfig extends AbstractModel {
  readonly tokenServiceUrl: string;
  readonly routeRegistryUrl: string;
  readonly loginUrl: string;

  constructor(data: UiConfigSchema) {
    super();
    this.tokenServiceUrl = data.tokenServiceUrl;
    this.routeRegistryUrl = data.routeRegistryUrl;
    this.loginUrl = data.loginUrl;
    Object.freeze(this);
  }
}
