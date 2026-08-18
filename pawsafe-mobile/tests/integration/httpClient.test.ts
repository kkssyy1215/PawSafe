import NetInfo from '@react-native-community/netinfo';
import { z } from 'zod';
import type { RouteAnalysisRequest } from '@/src/api/contracts';
import { requestJson } from '@/src/api/client';
import { HttpAnalysisProvider } from '@/src/providers/analysis/HttpAnalysisProvider';
import { HttpPlaceSearchProvider } from '@/src/providers/places/HttpPlaceSearchProvider';
import { makeRouteAnalysisResponse } from '@/tests/fixtures/routeAnalysis';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const request: RouteAnalysisRequest = {
  origin: { id: 'place_home', name: '우리집', address: '서울특별시 마포구 독막로 12', lat: 37.55, lng: 126.91 },
  destination: { id: 'place_mangwon_park', name: '망원한강공원', address: '서울특별시 마포구 마포나루길 467', lat: 37.555, lng: 126.9 },
  departure_at: '2026-08-12T18:30:00+09:00',
  walk_mode: 'cool',
};

const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const mockFetch = jest.fn();
const response = (payload: unknown, contentType = 'application/json', ok = true) => ({
  ok,
  headers: { get: (key: string) => key.toLowerCase() === 'content-type' ? contentType : null },
  json: jest.fn().mockResolvedValue(payload),
});

describe('HTTP analysis client', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true } as Awaited<ReturnType<typeof NetInfo.fetch>>);
    globalThis.fetch = mockFetch as typeof fetch;
  });
  afterEach(() => { jest.useRealTimers(); globalThis.fetch = originalFetch; });

  it('posts the exact route-analysis request body to the canonical endpoint', async () => {
    mockFetch.mockResolvedValue(response(makeRouteAnalysisResponse()));
    const result = await new HttpAnalysisProvider('https://api.example.test/').analyzeRoute(request);
    expect(result.analysis_id).toBe('analysis_gmm_001');
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.test/v1/route-analyses', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
    }));
  });

  it('adds an optional location hint when searching for nearby parks', async () => {
    mockFetch.mockResolvedValue(response({ items: [] }));
    await new HttpPlaceSearchProvider('https://api.example.test').searchPlaces(
      '공원',
      undefined,
      { near: { lat: 37.55, lng: 126.91 } },
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.test/v1/places/search?q=%EA%B3%B5%EC%9B%90&lat=37.55&lng=126.91',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects a contract-invalid or non-JSON response', async () => {
    mockFetch.mockResolvedValueOnce(response({ unexpected: true }));
    await expect(new HttpAnalysisProvider('https://api.example.test').analyzeRoute(request)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    mockFetch.mockResolvedValueOnce(response('gateway page', 'text/html'));
    await expect(new HttpAnalysisProvider('https://api.example.test').analyzeRoute(request)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('fails before fetch when the device is offline', async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false } as Awaited<ReturnType<typeof NetInfo.fetch>>);
    await expect(new HttpAnalysisProvider('https://api.example.test').analyzeRoute(request)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('aborts a request when its client timeout expires', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('transport aborted')));
    }));
    const pending = requestJson({
      baseUrl: 'https://api.example.test', path: '/slow', schema: z.object({ ok: z.boolean() }), timeoutMs: 10,
    });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'ANALYSIS_TIMEOUT', retryable: true });
    await Promise.resolve();
    await jest.runAllTimersAsync();
    await assertion;
  });
});
