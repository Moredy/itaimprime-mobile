import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./AuthProvider";
import { getErrorMessage } from "@/utils/errors";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      Alert.alert("Erro", getErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
