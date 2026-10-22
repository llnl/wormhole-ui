import { AbstractRepository } from './AbstractRepository';
import { getUiConfig } from '../config';
import { Route } from '../models/Route';
import type { ListRoutesResponse } from '../route-registry-api-bodies';

export class RouteRepository extends AbstractRepository {
  public constructor() {
    super(() => getUiConfig().routeRegistryUrl);
  }

  public async getAllRoutes(): Promise<Route[]> {
    const routes = await this.get<ListRoutesResponse>('/api/v1/route');

    return routes.map((route) => new Route(route));
  }
}
