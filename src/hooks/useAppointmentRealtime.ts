import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import EventSource from "react-native-sse";
import { env } from "@/config/env";
import { sessionStore } from "@/lib/sessionStore";

const REALTIME_ENDPOINT = `${env.apiUrl}/api/appointments/realtime`;
type AppointmentRealtimeEventName = "appointment";

export function useAppointmentRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let source: EventSource<AppointmentRealtimeEventName> | null = null;
    let invalidateTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const invalidateAppointmentQueries = () => {
      if (invalidateTimer) {
        clearTimeout(invalidateTimer);
      }

      invalidateTimer = setTimeout(() => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["appointments"] }),
          queryClient.invalidateQueries({ queryKey: ["slots"] }),
          queryClient.invalidateQueries({ queryKey: ["rooms-for-time"] }),
          queryClient.invalidateQueries({ queryKey: ["available-times"] }),
        ]);
      }, 150);
    };

    const connect = async () => {
      const cookie = await sessionStore.getCookie();
      if (cancelled || !cookie) {
        return;
      }

      source = new EventSource<AppointmentRealtimeEventName>(REALTIME_ENDPOINT, {
        headers: {
          Cookie: cookie,
        },
      });

      source.addEventListener("appointment", invalidateAppointmentQueries);
      source.addEventListener("error", () => {
        // The library handles reconnection internally; keep a no-op listener
        // so we can extend diagnostics later if needed.
      });
    };

    void connect();

    return () => {
      cancelled = true;

      if (invalidateTimer) {
        clearTimeout(invalidateTimer);
      }

      if (source) {
        source.removeAllEventListeners();
        source.close();
      }
    };
  }, [enabled, queryClient]);
}