import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { authApi } from "@/lib/authApi";
import { sessionStore } from "@/lib/sessionStore";
import type { UserSession } from "@/types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: UserSession | null;
  refreshSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserSession | null>(null);

  const refreshSession = useCallback(async () => {
    const cookie = await sessionStore.getCookie();
    const session = await authApi.getSession(cookie ?? undefined);

    if (session?.user) {
      setUser(session.user);
      setStatus("authenticated");
      return;
    }

    await sessionStore.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const cookie = await authApi.signIn(email, password);
      await sessionStore.setCookie(cookie);
      await refreshSession();
    },
    [refreshSession],
  );

  const signOut = useCallback(async () => {
    await sessionStore.clear();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, []);

  const value = useMemo(
    () => ({ status, user, refreshSession, signIn, signOut }),
    [refreshSession, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
};
