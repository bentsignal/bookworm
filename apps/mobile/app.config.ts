import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Worm",
  slug: "worm",
  owner: "directedbyshawn",
  scheme: "worm",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  updates: { fallbackToCacheTimeout: 0 },
  assetBundlePatterns: ["**/*"],
  extra: {
    ...config.extra,
    eas: {
      projectId: "728438a5-9760-4732-8606-e659fc60614c",
    },
  },
  ios: {
    bundleIdentifier: "com.bentsignal.worm",
    supportsTablet: true,
    icon: "./assets/icon.png",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      LSSupportsOpeningDocumentsInPlace: true,
      UIFileSharingEnabled: true,
    },
  },
  android: {
    package: "com.bentsignal.worm",
    adaptiveIcon: {
      backgroundColor: "#08261e",
      foregroundImage: "./assets/icon.png",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCompiler: true,
  },
  plugins: [
    "expo-router",
    [
      "expo-file-system",
      {
        enableFileSharing: true,
        supportsOpeningDocumentsInPlace: true,
      },
    ],
    "expo-system-ui",
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.4",
          usePrecompiledModules: false,
        },
      },
    ],
    "./expo-plugins/with-ios-scene-lifecycle.cjs",
    "./expo-plugins/with-ios-pods-deployment-target.cjs",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#f4f0e6",
        image: "./assets/icon.png",
        imageWidth: 180,
        dark: {
          backgroundColor: "#08261e",
          image: "./assets/icon.png",
        },
      },
    ],
  ],
});
