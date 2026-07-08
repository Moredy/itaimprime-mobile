import { addMinutes, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const toDate = (value: Date | string) =>
  value instanceof Date ? value : parseISO(value);

export const formatDate = (value: Date | string) =>
  format(toDate(value), "dd/MM/yyyy", { locale: ptBR });

export const formatDateTime = (value: Date | string) =>
  format(toDate(value), "dd/MM/yyyy HH:mm", { locale: ptBR });

export const formatTime = (value: Date | string) => format(toDate(value), "HH:mm");

export const formatAppointmentRange = (start: Date | string, end: Date | string) =>
  `${formatDate(start)} - ${formatTime(start)} as ${formatTime(end)}`;

export const createLocalDate = (date: string, time = "00:00") =>
  new Date(`${date}T${time}:00`);

export const addMinutesToDate = (date: Date, minutes: number) =>
  addMinutes(date, minutes);

export const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const dateInputValue = (value: Date | string) =>
  format(toDate(value), "yyyy-MM-dd");
