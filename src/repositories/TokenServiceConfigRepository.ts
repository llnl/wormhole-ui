import { AbstractRepository } from './AbstractRepository';
import { TokenServiceConfig } from '../models/TokenServiceConfig';
import type { GetTokenServiceConfigResponse } from '../token-service-api-bodies';

export class TokenServiceConfigRepository extends AbstractRepository {
  public constructor() {
    super('/token-service');
  }

  public async getConfig(): Promise<TokenServiceConfig> {
    const config =
      await this.get<GetTokenServiceConfigResponse>('/api/v1/config');

    return new TokenServiceConfig(config);
  }
}
