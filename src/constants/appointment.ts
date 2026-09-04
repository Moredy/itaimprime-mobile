export const appointmentDurationOptions = Array.from(
  { length: 16 },
  (_, index) => (index + 1) * 30,
);

export const formatAppointmentDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}min`;
  }

  return remainingMinutes === 0 ? `${hours}h` : `${hours}h${remainingMinutes}`;
};
