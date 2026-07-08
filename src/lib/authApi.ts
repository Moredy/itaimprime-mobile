import { nextAuthUrl } from "@/config/env";
import type { NextAuthSession } from "@/types/api";
import { mergeCookieHeaders, setCookiesToCookieHeader } from "./cookies";

const getSetCookie = (headers: Headers) => {
  const maybeHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof maybeHeaders.getSetCookie === "function") {
    return maybeHeaders.getSetCookie().join(",");
  }
  return headers.get("set-cookie") ?? headers.get("Set-Cookie");
};

export const authApi = {
  async getCsrf(cookieHeader?: string) {
    const response = await fetch(`${nextAuthUrl}/csrf`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    if (!response.ok) {
      throw new Error("Nao foi possivel iniciar a autenticacao.");
    }

    const data = (await response.json()) as { csrfToken: string };
    const cookie = setCookiesToCookieHeader(getSetCookie(response.headers));
    return { csrfToken: data.csrfToken, cookie };
  },

  async signIn(email: string, password: string) {
    const csrf = await this.getCsrf();
    const body = new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email,
      password,
      redirect: "false",
      json: "true",
    });

    const response = await fetch(`${nextAuthUrl}/callback/credentials?json=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrf.cookie,
      },
      body: body.toString(),
    });

    const responseCookie = setCookiesToCookieHeader(getSetCookie(response.headers));
    const cookie = mergeCookieHeaders(csrf.cookie, responseCookie);
    const payload = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };

    if (!response.ok || payload.error || !cookie) {
      throw new Error("Email ou senha incorretos.");
    }

    return cookie;
  },

  async getSession(cookieHeader?: string): Promise<NextAuthSession | null> {
    if (!cookieHeader) return null;

    const response = await fetch(`${nextAuthUrl}/session`, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) return null;

    const session = (await response.json()) as NextAuthSession;
    return session?.user?.id ? session : null;
  },
};
