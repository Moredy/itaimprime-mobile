const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
];

export const splitSetCookieHeader = (value: string | null) => {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,\s]+=)/g).map((cookie) => cookie.trim());
};

export const setCookieToPair = (setCookie: string) => setCookie.split(";")[0]?.trim() ?? "";

export const setCookiesToCookieHeader = (setCookieHeader: string | null) =>
  splitSetCookieHeader(setCookieHeader)
    .map(setCookieToPair)
    .filter(Boolean)
    .join("; ");

export const mergeCookieHeaders = (...headers: (string | null | undefined)[]) => {
  const cookieMap = new Map<string, string>();

  headers
    .filter((header): header is string => Boolean(header))
    .flatMap((header) => header.split(";"))
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [name] = pair.split("=");
      if (SESSION_COOKIE_NAMES.includes(name)) {
        cookieMap.set(name, pair);
      }
    });

  return Array.from(cookieMap.values()).join("; ");
};
