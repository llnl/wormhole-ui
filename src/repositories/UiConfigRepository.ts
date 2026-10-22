import { AbstractRepository } from './AbstractRepository';
import { UiConfig, type UiConfigSchema } from '../models/UiConfig';

export class UiConfigRepository extends AbstractRepository {
  public constructor() {
    // Relative, so config.json resolves against <base href>.
    super(() => '');
  }

  public async getConfig(): Promise<UiConfig> {
    return new UiConfig(await this.get<UiConfigSchema>('config.json'));
  }
}
