process.env.EXPO_PUBLIC_ANALYSIS_MODE ??= "mock";
process.env.EXPO_PUBLIC_PLACE_SEARCH_MODE ??= "mock";
process.env.EXPO_PUBLIC_MAP_MODE ??= "mock";
process.env.EXPO_PUBLIC_API_BASE_URL ??= "https://example-api.example.com";
process.env.EXPO_PUBLIC_SHOW_DEMO_CONTROLS ??= "false";

jest.setTimeout(10_000);
