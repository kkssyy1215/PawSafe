import { AppError } from '@/src/api/errors';
import { getMockRouteScenario } from '@/src/mocks/routeScenarios';
import type { AnalysisProvider } from './AnalysisProvider';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AppError('CANCELLED', 'Cancelled'));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new AppError('CANCELLED', 'Cancelled'));
    }, { once: true });
  });
}

export class MockAnalysisProvider implements AnalysisProvider {
  async analyzeRoute(request: Parameters<AnalysisProvider['analyzeRoute']>[0], signal?: AbortSignal) {
    await delay(650, signal);
    const scenarioId = request.destination.id;
    if (scenarioId === 'scenario_out_of_coverage') throw new AppError('OUT_OF_COVERAGE', 'Demo scenario', false);
    if (scenarioId === 'scenario_no_route') throw new AppError('NO_ROUTE', 'Demo scenario', false);
    if (scenarioId === 'scenario_timeout') throw new AppError('ANALYSIS_TIMEOUT', 'Demo scenario', true);
    return getMockRouteScenario({ ...request, departure_at: request.departure_at ?? new Date().toISOString() });
  }
}
