import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "bookworm",
  slug: "worm",
  owner: "directedbyshawn",
  scheme: "worm",
  version: "0.1.29",
  orientation: "portrait",
  icon: "./assets/icons/icon-paper.png",
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
    buildNumber: "31",
    bundleIdentifier: "com.bentsignal.worm",
    supportsTablet: true,
    icon: "./assets/icons/icon-paper.png",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      LSSupportsOpeningDocumentsInPlace: true,
      UIFileSharingEnabled: true,
    },
  },
  android: {
    versionCode: 31,
    package: "com.bentsignal.worm",
    adaptiveIcon: {
      backgroundColor: "#eee5d3",
      foregroundImage: "./assets/icons/icon-paper.png",
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
      "./expo-plugins/with-ios-alternate-icons.cjs",
      {
        icons: [
          { name: "IconForest", path: "./assets/icons/icon-forest.png" },
          { name: "IconNavy", path: "./assets/icons/icon-navy.png" },
          { name: "IconClay", path: "./assets/icons/icon-clay.png" },
          { name: "IconPlum", path: "./assets/icons/icon-plum.png" },
          { name: "IconLight", path: "./assets/icons/icon-light.png" },
          { name: "IconDark", path: "./assets/icons/icon-dark.png" },
          { name: "IconPaper", path: "./assets/icons/icon-paper.png" },
        ],
      },
    ],
    [
      "expo-file-system",
      {
        enableFileSharing: true,
        supportsOpeningDocumentsInPlace: true,
      },
    ],
    "expo-system-ui",
    "expo-font",
    "expo-sharing",
    "expo-status-bar",
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.4",
        },
      },
    ],
    "./expo-plugins/with-ios-scene-lifecycle.cjs",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#f4f0e6",
        image: "./assets/splash-icon.png",
        imageWidth: 180,
        dark: {
          backgroundColor: "#08261e",
          image: "./assets/splash-icon.png",
        },
      },
    ],
  ],
});
