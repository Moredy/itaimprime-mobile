import { Redirect } from "expo-router";
import { LoadingState } from "./StateView";
import { useAuth } from "@/providers/AuthProvider";

export function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") return <LoadingState label="Validando sessao..." />;
  if (status === "unauthenticated") return <Redirect href="/login" />;

  return children;
}
