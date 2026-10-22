import { AbstractModel } from './AbstractModel';

export interface UiConfigSchema {
  tokenServiceUrl: string;
  routeRegistryUrl: string;
}

export class UiConfig extends AbstractModel {
  readonly tokenServiceUrl: string;
  readonly routeRegistryUrl: string;

  constructor(data: UiConfigSchema) {
    super();
    this.tokenServiceUrl = data.tokenServiceUrl;
    this.routeRegistryUrl = data.routeRegistryUrl;
    Object.freeze(this);
  }
}
