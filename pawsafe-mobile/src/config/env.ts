import { z } from 'zod';

const envSchema = z.object({
  analysisMode: z.enum(['mock', 'api']).default('api'),
  placeSearchMode: z.enum(['mock', 'api']).default('mock'),
  placeDataset: z.enum(['demo', 'pipeline']).default('demo'),
  locationMode: z.enum(['mock', 'device']).default('mock'),
  mapMode: z.enum(['mock', 'native']).default('native'),
  apiBaseUrl: z.string().url().default('https://example-api.example.com'),
  showDemoControls: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse({
  analysisMode: process.env.EXPO_PUBLIC_ANALYSIS_MODE,
  placeSearchMode: process.env.EXPO_PUBLIC_PLACE_SEARCH_MODE,
  placeDataset: process.env.EXPO_PUBLIC_PLACE_DATASET,
  locationMode: process.env.EXPO_PUBLIC_LOCATION_MODE,
  mapMode: process.env.EXPO_PUBLIC_MAP_MODE,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  showDemoControls: process.env.EXPO_PUBLIC_SHOW_DEMO_CONTROLS,
});

if (!parsed.success) {
  throw new Error(`PawSafe 공개 환경 변수 설정이 올바르지 않습니다: ${parsed.error.message}`);
}

export const env = parsed.data;
