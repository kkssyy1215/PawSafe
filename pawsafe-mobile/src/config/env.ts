import { z } from 'zod';

const envSchema = z.object({
  analysisMode: z.enum(['mock', 'api']).default('mock'),
  placeSearchMode: z.enum(['mock', 'api']).default('mock'),
  mapMode: z.enum(['mock', 'native']).default('native'),
  apiBaseUrl: z.string().url().default('https://example-api.example.com'),
  showDemoControls: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse({
  analysisMode: process.env.EXPO_PUBLIC_ANALYSIS_MODE,
  placeSearchMode: process.env.EXPO_PUBLIC_PLACE_SEARCH_MODE,
  mapMode: process.env.EXPO_PUBLIC_MAP_MODE,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  showDemoControls: process.env.EXPO_PUBLIC_SHOW_DEMO_CONTROLS,
});

if (!parsed.success) {
  throw new Error(`PawSafe 공개 환경 변수 설정이 올바르지 않습니다: ${parsed.error.message}`);
}

export const env = parsed.data;
