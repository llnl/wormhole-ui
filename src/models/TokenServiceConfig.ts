import { AbstractModel } from './AbstractModel';
import type { components } from '../token-service-api-types';

type ConfigSchema = components['schemas']['ConfigResponse'];

export class TokenServiceConfig extends AbstractModel {
  readonly sessionTokenName: string;
  readonly maxTokenLifetimeDays: number;

  constructor(data: ConfigSchema) {
    super();
    this.sessionTokenName = data.token.session_name;
    this.maxTokenLifetimeDays = data.token.max_lifetime_days;
    Object.freeze(this);
  }
}
