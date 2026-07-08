import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpcUrl } from "@/config/env";
import { sessionStore } from "./sessionStore";

const client = createTRPCProxyClient<any>({
  links: [
    httpBatchLink({
      url: trpcUrl,
      transformer: superjson,
      async headers() {
        const cookie = await sessionStore.getCookie();
        return cookie ? { Cookie: cookie } : {};
      },
    }),
  ],
});

export const trpcClient = client as any;
