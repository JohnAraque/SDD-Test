import { getDb } from '../../db/database';
import type { Court, TimeSlotAvailability } from './types';

export const courtsCatalog: readonly Court[] = Object.freeze([
  { id: 1, name: 'Cancha Laureles' },
  { id: 2, name: 'Cancha El Poblado' },
  { id: 3, name: 'Cancha Belén' },
  { id: 4, name: 'Cancha Robledo' },
  { id: 5, name: 'Cancha Envigado' }
]);

export const getCourts = (): readonly Court[] => courtsCatalog;

export const getCourtById = (courtId: number): Court | undefined => {
  return courtsCatalog.find((court) => court.id === courtId);
};

export const formatTimeSlotLabel = (startHour: number): string => {
  const startStr = String(startHour).padStart(2, '0');
  const endHour = (startHour + 1) % 24;
  const endStr = String(endHour).padStart(2, '0');
  return `${startStr}:00 - ${endStr}:00`;
};

export const getCurrentLocalDateAndHour = (
  now: Date = new Date()
): { todayStr: string; currentHour: number } => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentHour = now.getHours();
  return { todayStr, currentHour };
};

export const isValidDateString = (dateStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

export const isSlotInPast = (
  dateStr: string,
  startHour: number,
  now: Date = new Date()
): boolean => {
  const { todayStr, currentHour } = getCurrentLocalDateAndHour(now);
  if (dateStr < todayStr) {
    return true;
  }
  if (dateStr === todayStr && startHour <= currentHour) {
    return true;
  }
  return false;
};

export const getCourtAvailability = (
  courtId: number,
  dateStr: string,
  now: Date = new Date()
): {
  status: number;
  body: Record<string, unknown>;
} => {
  const court = getCourtById(courtId);
  if (!court || !isValidDateString(dateStr)) {
    return {
      status: 400,
      body: { error: 'Cancha o formato de fecha inválido (use YYYY-MM-DD)' }
    };
  }

  const db = getDb();
  const rows = db
    .prepare(
      'SELECT start_hour FROM reservations WHERE court_id = ? AND date = ?'
    )
    .all(courtId, dateStr) as Array<{ start_hour: number }>;

  const reservedHours = new Set(rows.map((r) => r.start_hour));

  const slots: TimeSlotAvailability[] = Array.from({ length: 24 }, (_, hour) => ({
    startHour: hour,
    label: formatTimeSlotLabel(hour),
    status: reservedHours.has(hour) ? 'Reservado' : 'Disponible',
    isPast: isSlotInPast(dateStr, hour, now)
  }));

  return {
    status: 200,
    body: {
      court,
      date: dateStr,
      slots
    }
  };
};
