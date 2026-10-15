import type { JsonResponse } from './api-bodies';
import type { operations } from './route-registry-api-types';

export type ListRoutesResponse = JsonResponse<
  operations['list_available_api_v1_route_get'],
  200
>;
