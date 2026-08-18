import { z } from 'zod';

const envSchema = z.object({
  apiBaseUrl: z.string().url().default('https://example-api.example.com'),
});

const parsed = envSchema.safeParse({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  throw new Error(`온:길 공개 환경 변수 설정이 올바르지 않습니다: ${parsed.error.message}`);
}

export const env = parsed.data;
