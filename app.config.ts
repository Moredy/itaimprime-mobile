import type { ExpoConfig } from "expo/config";

const appEnv = process.env.APP_ENV ?? "dev";

const apiUrlByEnv: Record<string, string> = {
  dev: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  homolog: process.env.EXPO_PUBLIC_API_URL ?? "https://homolog.seu-dominio.com",
  prod: process.env.EXPO_PUBLIC_API_URL ?? "https://app.seu-dominio.com",
};

const config: ExpoConfig = {
  name: "Agenda Medica Itaim Prime",
  slug: "agendamento-medico-mobile",
  scheme: "agendamedica",
  version: "0.1.0",
  icon: "./assets/icon.png",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#081431",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.itaimprime.agendamedica",
  },
  android: {
    package: "com.itaimprime.agendamedica",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/adaptive-icon-monochrome.png",
      backgroundColor: "#081431",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv,
    apiUrl: apiUrlByEnv[appEnv] ?? apiUrlByEnv.dev,
    eas: {
      projectId: "configure-no-eas",
    },
  },
};

export default config;
