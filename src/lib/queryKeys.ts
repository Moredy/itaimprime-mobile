export const queryKeys = {
  session: ["session"] as const,
  patients: (search?: string) => ["patients", search ?? ""] as const,
  appointments: (status?: string) => ["appointments", status ?? "all"] as const,
  rooms: ["rooms"] as const,
  contracts: (limit = 10, offset = 0) => ["contracts", limit, offset] as const,
  contractDetails: (contractId: number | null) => ["contract-details", contractId ?? "none"] as const,
  consultationTypes: ["consultation-types"] as const,
  userSettings: ["user-settings"] as const,
  doctorWorkingHours: ["doctor-working-hours"] as const,
  slots: (date: string, roomId: string, duration: number) =>
    ["slots", date, roomId, duration] as const,
  roomsForTime: (date: string, time: string, duration: number) =>
    ["rooms-for-time", date, time, duration] as const,
};
