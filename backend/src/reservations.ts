import { getDb } from '../../db/database';
import {
  formatTimeSlotLabel,
  getCourtById,
  getCurrentLocalDateAndHour,
  isOperatingHour,
  isSlotInPast,
  isValidDateString
} from './courts';
import type { Reservation } from './types';

interface ReservationRow {
  id: number;
  user_id: number;
  court_id: number;
  date: string;
  start_hour: number;
  created_at: string;
}

const mapRowToReservation = (row: ReservationRow): Reservation => {
  const court = getCourtById(row.court_id);
  return {
    id: row.id,
    userId: row.user_id,
    courtId: row.court_id,
    courtName: court ? court.name : 'Cancha Laureles',
    date: row.date,
    startHour: row.start_hour,
    timeSlot: formatTimeSlotLabel(row.start_hour),
    createdAt: row.created_at
  };
};

export const createReservation = (
  userId: number,
  rawCourtId: unknown,
  rawDate: unknown,
  rawStartHour: unknown,
  now: Date = new Date()
): { status: number; body: Record<string, unknown> } => {
  const courtId = typeof rawCourtId === 'number' ? rawCourtId : Number(rawCourtId);
  const dateStr = typeof rawDate === 'string' ? rawDate.trim() : '';
  const startHour =
    typeof rawStartHour === 'number' ? rawStartHour : Number(rawStartHour);

  const court = getCourtById(courtId);
  if (
    !court ||
    !Number.isInteger(courtId) ||
    !isValidDateString(dateStr) ||
    !Number.isInteger(startHour) ||
    startHour < 0 ||
    startHour > 23
  ) {
    return {
      status: 400,
      body: { error: 'Los datos de la reserva son inválidos' }
    };
  }

  if (!isOperatingHour(startHour)) {
    return {
      status: 400,
      body: {
        error:
          'El horario seleccionado está fuera del horario habilitado (07:00 a 22:00)'
      }
    };
  }

  if (isSlotInPast(dateStr, startHour, now)) {
    return {
      status: 400,
      body: {
        error:
          'No se pueden realizar reservas en fechas u horarios que ya han transcurrido'
      }
    };
  }

  const db = getDb();
  const { todayStr, currentHour } = getCurrentLocalDateAndHour(now);

  const executeAtomicBooking = db.transaction(
    (): { status: number; body: Record<string, unknown> } => {
      const slotTaken = db
        .prepare(
          'SELECT id FROM reservations WHERE court_id = ? AND date = ? AND start_hour = ?'
        )
        .get(courtId, dateStr, startHour) as { id: number } | undefined;

      if (slotTaken) {
        return {
          status: 409,
          body: { error: 'La cancha ya fue reservada en este horario' }
        };
      }

      const activeUserReservation = db
        .prepare(
          `SELECT id FROM reservations
           WHERE user_id = ?
             AND (date > ? OR (date = ? AND start_hour > ?))
           LIMIT 1`
        )
        .get(userId, todayStr, todayStr, currentHour) as { id: number } | undefined;

      if (activeUserReservation) {
        return {
          status: 409,
          body: {
            error:
              'Ya tienes una reserva activa. Solo puedes tener una reserva futura a la vez'
          }
        };
      }

      const insertResult = db
        .prepare(
          'INSERT INTO reservations (user_id, court_id, date, start_hour) VALUES (?, ?, ?, ?)'
        )
        .run(userId, courtId, dateStr, startHour);

      const createdRow = db
        .prepare(
          'SELECT id, user_id, court_id, date, start_hour, created_at FROM reservations WHERE id = ?'
        )
        .get(Number(insertResult.lastInsertRowid)) as ReservationRow;

      return {
        status: 201,
        body: { reservation: mapRowToReservation(createdRow) }
      };
    }
  );

  try {
    return executeAtomicBooking.immediate();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code.includes('SQLITE_CONSTRAINT')) {
      return {
        status: 409,
        body: { error: 'La cancha ya fue reservada en este horario' }
      };
    }
    return {
      status: 400,
      body: { error: 'No se pudo procesar la reserva en este momento' }
    };
  }
};

export const getUserReservations = (
  userId: number,
  now: Date = new Date()
): { upcoming: Reservation[]; past: Reservation[] } => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, user_id, court_id, date, start_hour, created_at
       FROM reservations
       WHERE user_id = ?
       ORDER BY date ASC, start_hour ASC`
    )
    .all(userId) as ReservationRow[];

  const upcoming: Reservation[] = [];
  const past: Reservation[] = [];

  for (const row of rows) {
    const mapped = mapRowToReservation(row);
    if (isSlotInPast(row.date, row.start_hour, now)) {
      past.push(mapped);
    } else {
      upcoming.push(mapped);
    }
  }

  past.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.startHour - a.startHour;
  });

  return { upcoming, past };
};

export const cancelReservation = (
  userId: number,
  reservationId: number,
  now: Date = new Date()
): { status: number; body: Record<string, unknown> } => {
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return {
      status: 400,
      body: { error: 'Identificador de reserva inválido' }
    };
  }

  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, user_id, court_id, date, start_hour, created_at FROM reservations WHERE id = ?'
    )
    .get(reservationId) as ReservationRow | undefined;

  if (!row) {
    return {
      status: 400,
      body: { error: 'La reserva no existe o ya fue cancelada' }
    };
  }

  if (row.user_id !== userId) {
    return {
      status: 401,
      body: { error: 'No tienes permiso para cancelar una reserva de otro usuario' }
    };
  }

  if (isSlotInPast(row.date, row.start_hour, now)) {
    return {
      status: 400,
      body: {
        error: 'No es posible cancelar una reserva que ya ha iniciado o transcurrido'
      }
    };
  }

  db.prepare('DELETE FROM reservations WHERE id = ? AND user_id = ?').run(
    reservationId,
    userId
  );

  return {
    status: 200,
    body: { message: 'Reserva cancelada exitosamente' }
  };
};
