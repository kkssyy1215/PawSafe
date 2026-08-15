import { Platform } from 'react-native';
import type { RouteAnalysisRequest } from '@/src/api/contracts';
import { routeAnalysisRequestSchema } from '@/src/api/schemas';

const STORAGE_KEY = 'pawsafe.pending-route-request.v1';

function webStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis.sessionStorage === 'undefined') return null;
  return globalThis.sessionStorage;
}

export function savePendingRouteRequest(request: RouteAnalysisRequest): void {
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(request));
  } catch {
    // Session storage can be disabled; the in-memory flow still works.
  }
}

export function loadPendingRouteRequest(): RouteAnalysisRequest | null {
  try {
    const raw = webStorage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = routeAnalysisRequestSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearPendingRouteRequest(): void {
  try {
    webStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
