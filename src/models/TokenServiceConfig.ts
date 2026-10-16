import { AbstractModel } from './AbstractModel';
import type { components } from '../token-service-api-types';

type ConfigSchema = components['schemas']['ConfigResponse'];

export class TokenServiceConfig extends AbstractModel {
  readonly maxTokenLifetimeDays: number;

  constructor(data: ConfigSchema) {
    super();
    this.maxTokenLifetimeDays = data.token.max_lifetime_days;
    Object.freeze(this);
  }
}
