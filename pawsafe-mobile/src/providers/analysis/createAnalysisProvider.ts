import { env } from '@/src/config/env';
import type { AnalysisProvider } from './AnalysisProvider';
import { HttpAnalysisProvider } from './HttpAnalysisProvider';
import { MockAnalysisProvider } from './MockAnalysisProvider';

let provider: AnalysisProvider | undefined;
export function createAnalysisProvider(config = env): AnalysisProvider {
  return config.analysisMode === 'api' ? new HttpAnalysisProvider(config.apiBaseUrl) : new MockAnalysisProvider();
}
export function getAnalysisProvider(): AnalysisProvider {
  provider ??= createAnalysisProvider();
  return provider;
}
