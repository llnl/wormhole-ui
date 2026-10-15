import { AbstractModel } from './AbstractModel';
import type { components } from '../token-service-api-types';

type TokenSchema = components['schemas']['Token'];

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
}
