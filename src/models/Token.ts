import { DateTime } from 'luxon';
import { AbstractModel } from './AbstractModel';
import type { components } from '../token-service-api-types';

type TokenSchema = components['schemas']['Token'];

export const EXPIRING_SOON_DAYS = 7;

export type TokenStatus =
  'valid' | 'expiring-soon' | 'not-yet-valid' | 'expired';

export class Token extends AbstractModel {
  name: string;
  id: string | null;
  iat: number | null;
  nbf: number | null;
  exp: number | null;
  paths: string[] | null;
  scopes: string[] | null;
  rotatable: boolean | null;

  constructor(data: Partial<TokenSchema>) {
    super();
    this.name = data.name ?? '';
    this.id = data.id ?? null;
    this.iat = data.iat ?? null;
    this.nbf = data.nbf ?? null;
    this.exp = data.exp ?? null;
    this.paths = data.paths ?? null;
    this.scopes = data.scopes ?? null;
    this.rotatable = data.rotatable ?? null;
  }

  public isExpired(now: DateTime = DateTime.now()): boolean {
    return this.exp !== null && now.toSeconds() >= this.exp;
  }

  public isNotYetValid(now: DateTime = DateTime.now()): boolean {
    // By default nbf is the creation time on the token service's clock, which
    // can be ahead of the browser's, so it counts only if set over a minute
    // after creation.
    return (
      this.nbf !== null &&
      (this.iat === null || this.nbf - this.iat > 60) &&
      now.toSeconds() <= this.nbf
    );
  }

  public isExpiringSoon(now: DateTime = DateTime.now()): boolean {
    return (
      this.exp !== null &&
      !this.isExpired(now) &&
      this.exp - now.toSeconds() <= EXPIRING_SOON_DAYS * 24 * 60 * 60
    );
  }

  public status(now: DateTime = DateTime.now()): TokenStatus {
    if (this.isExpired(now)) {
      return 'expired';
    }
    if (this.isNotYetValid(now)) {
      return 'not-yet-valid';
    }
    return this.isExpiringSoon(now) ? 'expiring-soon' : 'valid';
  }
}
