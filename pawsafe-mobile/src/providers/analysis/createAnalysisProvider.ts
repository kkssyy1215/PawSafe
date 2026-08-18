import type { AnalysisProvider } from './AnalysisProvider';
import { HttpAnalysisProvider } from './HttpAnalysisProvider';
import { env } from '@/src/config/env';

let provider: AnalysisProvider | undefined;
export function createAnalysisProvider(config = env): AnalysisProvider {
  return new HttpAnalysisProvider(config.apiBaseUrl);
}
export function getAnalysisProvider(): AnalysisProvider {
  provider ??= createAnalysisProvider();
  return provider;
}
