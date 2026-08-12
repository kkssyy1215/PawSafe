import type { RouteAnalysisRequest } from '@/src/api/contracts';
import { requestJson } from '@/src/api/client';
import { routeAnalysisResponseSchema } from '@/src/api/schemas';
import type { AnalysisProvider } from './AnalysisProvider';

export class HttpAnalysisProvider implements AnalysisProvider {
  constructor(private readonly baseUrl: string) {}
  analyzeRoute(request: RouteAnalysisRequest, signal?: AbortSignal) {
    return requestJson({
      baseUrl: this.baseUrl,
      path: '/v1/route-analyses',
      method: 'POST',
      body: request,
      signal,
      schema: routeAnalysisResponseSchema,
    });
  }
}
