import m from 'mithril';
import { redirectToLogin } from '../login';

interface ApiError {
  response?: {
    detail?: string | ({ msg?: string } | string)[];
    message?: string;
  };
  message?: string;
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export abstract class AbstractRepository {
  protected constructor(private readonly basePath: () => string) {}

  private url(route: string): string {
    return `${this.basePath()}${route}`;
  }

  private normalizeError(error: unknown): Error {
    const err = error as ApiError | undefined;
    const detail = err?.response?.detail;

    if (typeof detail === 'string') {
      return new Error(detail);
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((d) => (typeof d === 'string' ? d : (d.msg ?? JSON.stringify(d))))
        .filter((msg) => msg.length > 0);
      return new Error(
        messages.length > 0
          ? messages.join(', ')
          : 'An unexpected error occurred.'
      );
    }
    if (err?.response?.message) {
      return new Error(err.response.message);
    }
    if (err?.message && err.message !== '[object Object]') {
      return new Error(err.message);
    }
    return new Error('An unexpected error occurred.');
  }

  private async request<T>(
    method: string,
    route: string,
    { params, ...init }: RequestInit & { params?: m.Params } = {}
  ): Promise<T> {
    const query = params === undefined ? '' : m.buildQueryString(params);
    try {
      const response = await fetch(
        query ? `${this.url(route)}?${query}` : this.url(route),
        { ...init, method, redirect: 'manual' }
      );
      if (response.type === 'opaqueredirect') {
        return await redirectToLogin();
      }

      const text = await response.text();
      if (!response.ok) {
        throw Object.assign(new Error(text), { response: parseJson(text) });
      }
      return (text ? JSON.parse(text) : null) as T;
    } catch (error: unknown) {
      throw this.normalizeError(error);
    } finally {
      m.redraw();
    }
  }

  protected get<T>(route: string, params?: m.Params): Promise<T> {
    return this.request<T>('GET', route, { params });
  }

  protected post<T>(route: string, data: Record<string, string>): Promise<T> {
    return this.request<T>('POST', route, { body: new URLSearchParams(data) });
  }

  protected async delete(route: string, params?: m.Params): Promise<void> {
    await this.request('DELETE', route, { params });
  }

  protected async patch(
    route: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.request('PATCH', route, {
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
