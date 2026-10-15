import { AbstractModel } from './AbstractModel';
import type { components } from '../route-registry-api-types';

type RouteSchema = components['schemas']['Route'];

export class Route extends AbstractModel {
  name: string;
  id: string | null;
  src: string | null;
  dst: string | null;
  communityName: string | null;

  constructor(data: Partial<RouteSchema>) {
    super();
    this.name = data.name ?? '';
    this.id = data.id ?? null;
    this.src = data.src ?? null;
    this.dst = data.dst ?? null;
    this.communityName = data.community_name ?? null;
  }
}
