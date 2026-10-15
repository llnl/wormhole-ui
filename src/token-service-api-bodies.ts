import type { JsonRequestBody, JsonResponse } from './api-bodies';
import type { operations } from './token-service-api-types';

export type ListTokensResponse = JsonResponse<
  operations['list_tokens_api_v1_token_get'],
  200
>;
export type CreateTokenResponse = JsonResponse<
  operations['create_api_v1_token_post'],
  201
>;
export type AttestTokensRequest = JsonRequestBody<
  operations['attestation_api_v1_token_attestation_patch']
>;
