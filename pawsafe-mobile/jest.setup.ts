process.env.EXPO_PUBLIC_API_BASE_URL ??= "https://example-api.example.com";

jest.setTimeout(10_000);

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    isRecognitionAvailable: jest.fn(() => true),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));
