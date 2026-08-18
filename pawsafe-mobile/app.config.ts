import type { ConfigContext, ExpoConfig } from "expo/config";

const locationPermission =
  "출발지 설정과 산책 중 음성 경로 안내를 위해 앱 사용 중 현재 위치 접근이 필요합니다.";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Standalone Android builds of react-native-maps may need a Google Maps key.
  // Keep it in EAS/local build secrets, never in an EXPO_PUBLIC_ variable.
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  return {
    ...config,
    name: "온:길",
    slug: "pawsafe",
    version: "1.0.0",
    scheme: "pawsafe",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/brand/icon.png",
    newArchEnabled: true,
    ios: {
      ...config.ios,
      bundleIdentifier: "com.pawsafe.mobile",
      supportsTablet: true,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription: locationPermission,
      },
    },
    android: {
      ...config.android,
      package: "com.pawsafe.mobile",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        backgroundColor: "#F7F5EF",
        foregroundImage: "./assets/brand/adaptive-icon.png",
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      blockedPermissions: [
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_CONTACTS",
        "android.permission.WRITE_CONTACTS",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      config: googleMapsApiKey
        ? {
            ...config.android?.config,
            googleMaps: { apiKey: googleMapsApiKey },
          }
        : config.android?.config,
    },
    web: {
      ...config.web,
      bundler: "metro",
      output: "static",
      favicon: "./assets/brand/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-asset",
      [
        "expo-splash-screen",
        {
          image: "./assets/brand/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#F7F5EF",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: locationPermission,
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: false,
          isAndroidForegroundServiceEnabled: false,
        },
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission: "출발지와 목적지를 음성으로 입력하기 위해 마이크 접근이 필요합니다.",
          speechRecognitionPermission: "말한 주소를 검색어로 변환하기 위해 음성 인식 접근이 필요합니다.",
          androidSpeechServicePackages: ["com.google.android.googlequicksearchbox"],
        },
      ],
      "@react-native-community/datetimepicker",
    ],
    experiments: {
      ...config.experiments,
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
