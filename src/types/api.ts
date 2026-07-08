export type UserSession = {
  id: string;
  name?: string | null;
  email?: string | null;
  specialty?: string | null;
  conexaPersonId?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
};

export type NextAuthSession = {
  user?: UserSession;
  expires?: string;
};

export type CheckUserStatusResult = {
  existsInConexa: boolean;
  existsInLocal: boolean;
  name?: string | null;
  specialty?: string | null;
  personId?: string | null;
  isActive: boolean;
  isMockMode: boolean;
};

export type Patient = {
  id: string;
  name: string;
  cpf: string;
  birthDate: Date | string;
  phone: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Room = {
  id: string;
  name: string;
  description?: string | null;
  specialties: string[];
  workspaceId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ConsultationType = {
  id: string;
  name: string;
  duration: number;
  userId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type AvailableSlot = {
  startTime: Date | string;
  endTime: Date | string;
  formatted: string;
};

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELED";

export type Appointment = {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: AppointmentStatus;
  roomId: string;
  userId: string;
  patientId?: string | null;
  conexaWorkspaceId?: string | null;
  conexaPersonId?: string | null;
  conexaCheckInStatus?: string | null;
  conexaCheckInAt?: Date | string | null;
  conexaCheckInError?: string | null;
  room?: Room;
  patient?: Patient | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type DoctorWorkingHoursInterval = {
  id?: string;
  startTime: string;
  endTime: string;
};

export type DoctorWorkingHoursDay = {
  id?: string;
  dayOfWeek: number;
  isActive: boolean;
  intervals: DoctorWorkingHoursInterval[];
};
