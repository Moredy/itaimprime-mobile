import Constants from "expo-constants";

type ExtraConfig = {
  appEnv?: "dev" | "homolog" | "prod";
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  appEnv: extra.appEnv ?? "dev",
  apiUrl: (extra.apiUrl ?? "http://localhost:3000").replace(/\/$/, ""),
};

export const trpcUrl = `${env.apiUrl}/api/trpc`;
export const nextAuthUrl = `${env.apiUrl}/api/auth`;
