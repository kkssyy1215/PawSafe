import type { RouteAnalysisRequest, RouteAnalysisResponse } from '@/src/api/contracts';

export interface AnalysisProvider {
  analyzeRoute(request: RouteAnalysisRequest, signal?: AbortSignal): Promise<RouteAnalysisResponse>;
}
