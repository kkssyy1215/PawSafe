import NetInfo from '@react-native-community/netinfo';
import type { z } from 'zod';
import { API_TIMEOUT_MS } from '@/src/config/constants';
import { AppError, type AppErrorCode } from './errors';
import { apiErrorEnvelopeSchema } from './schemas';

const supportedCodes = new Set<AppErrorCode>([
  'VALIDATION_ERROR', 'OUT_OF_COVERAGE', 'PLACE_NOT_FOUND', 'SAME_LOCATION', 'NO_WALKABLE_NODE',
  'NO_ROUTE', 'ANALYSIS_TIMEOUT', 'NETWORK_ERROR', 'EXTERNAL_API_ERROR', 'MODEL_NOT_READY',
  'PIPELINE_NOT_READY', 'INVALID_RESPONSE', 'INTERNAL_ERROR',
  'HEAT_DATA_NOT_AVAILABLE', 'STALE_HEAT_DATA', 'EXTERNAL_API_TIMEOUT', 'INVALID_DATA_FILE',
]);

export async function requestJson<T>(options: {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}): Promise<T> {
  const network = await NetInfo.fetch();
  if (network.isConnected === false) throw new AppError('NETWORK_ERROR', 'Offline', true);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? API_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort('caller');
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}${options.path}`, {
      method: options.method ?? 'GET',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json')) throw new AppError('INVALID_RESPONSE', 'Expected JSON');
    const payload: unknown = await response.json();

    if (!response.ok) {
      const parsedError = apiErrorEnvelopeSchema.safeParse(payload);
      if (!parsedError.success) throw new AppError('INVALID_RESPONSE', 'Invalid error response');
      const rawCode = parsedError.data.error.code as AppErrorCode;
      const code = supportedCodes.has(rawCode) ? rawCode : 'INTERNAL_ERROR';
      throw new AppError(code, 'Server request failed', parsedError.data.error.retryable, parsedError.data.error.request_id);
    }
    const parsed = options.schema.safeParse(payload);
    if (!parsed.success) throw new AppError('INVALID_RESPONSE', parsed.error.message);
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (controller.signal.aborted) {
      if (options.signal?.aborted) throw new AppError('CANCELLED', 'Caller cancelled request');
      throw new AppError('ANALYSIS_TIMEOUT', 'Request timeout', true);
    }
    throw new AppError('NETWORK_ERROR', 'Network request failed', true);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}
