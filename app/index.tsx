import { Redirect } from "expo-router";
import { LoadingState } from "@/components/StateView";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { status } = useAuth();

  if (status === "loading") return <LoadingState label="Abrindo agenda..." />;
  if (status === "authenticated") return <Redirect href="/appointments" />;
  return <Redirect href="/login" />;
}
