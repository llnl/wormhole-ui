import { AbstractRepository } from './AbstractRepository';
import { Token } from '../models/Token';
import type {
  ListTokensResponse,
  CreateTokenResponse,
  AttestTokensRequest,
} from '../token-service-api-bodies';

export class TokenRepository extends AbstractRepository {
  public constructor() {
    super('/token-service');
  }

  public async getAllTokens(): Promise<Token[]> {
    const tokens = await this.get<ListTokensResponse>('/api/v1/token');

    return tokens.map((token) => new Token(token));
  }

  public async createToken(token: Token): Promise<string> {
    const data: Record<string, string> = { name: token.name };

    if (token.nbf !== null) {
      data.nbf = token.nbf.toString();
    }
    if (token.exp !== null) {
      data.exp = token.exp.toString();
    }

    return await this.post<CreateTokenResponse>('/api/v1/token', data);
  }

  public async deleteToken(token: Token): Promise<void> {
    await this.delete('/api/v1/token', { name: token.name });
  }

  public async attestToken(token: Token): Promise<void> {
    if (token.id === null) {
      throw new Error('Token has no id.');
    }
    const data: AttestTokensRequest = { ids: [token.id] };
    await this.patch('/api/v1/token/attestation', data);
  }
}
