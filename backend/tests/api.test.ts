import path from 'path';
import fs from 'fs';

const testDbPath = path.resolve(__dirname, '../../db/padel.test.db');
process.env.PADEL_DB_PATH = testDbPath;

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getDb } from '../../db/database';
import {
  cancelReservation,
  createReservation,
  getUserReservations
} from '../src/reservations';

const app = createApp();

describe('Sistema de Reservas de Canchas de Pádel — API & Reglas de Negocio', () => {
  beforeEach(() => {
    const db = getDb();
    db.exec('DELETE FROM reservations; DELETE FROM users;');
  });

  afterAll(() => {
    const db = getDb();
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = `${testDbPath}${suffix}`;
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  });

  it('US2: bloquea el acceso a canchas y reservas sin sesión activa (401 Unauthorized)', async () => {
    const courtsRes = await request(app).get('/api/courts');
    expect(courtsRes.status).toBe(401);
    expect(courtsRes.body.error).toBeDefined();

    const availRes = await request(app).get(
      '/api/courts/1/availability?date=2099-12-31'
    );
    expect(availRes.status).toBe(401);

    const bookRes = await request(app)
      .post('/api/reservations')
      .send({ courtId: 1, date: '2099-12-31', startHour: 14 });
    expect(bookRes.status).toBe(401);
  });

  it('US2: registra usuarios, normaliza el correo, rechaza duplicados (409) y permite iniciar sesión', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: '  Jugador1@Padel.com ', password: 'password123' });

    expect(regRes.status).toBe(201);
    expect(regRes.body.token).toBeTypeOf('string');
    expect(regRes.body.user.email).toBe('jugador1@padel.com');

    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jugador1@padel.com', password: 'password123' });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toContain('registrado');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'JUGADOR1@PADEL.COM', password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf('string');
  });

  it('US1: lista las 5 canchas y devuelve la grilla de 24h con horario habilitado 07:00-22:00 (7..21) y deshabilitado 22:00-06:00 (0..6 y 22..23)', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'explorador@padel.com', password: 'password123' });
    const token = reg.body.token as string;

    const courtsRes = await request(app)
      .get('/api/courts')
      .set('Authorization', `Bearer ${token}`);
    expect(courtsRes.status).toBe(200);
    expect(courtsRes.body.courts).toEqual([
      { id: 1, name: 'Cancha Laureles' },
      { id: 2, name: 'Cancha El Poblado' },
      { id: 3, name: 'Cancha Belén' },
      { id: 4, name: 'Cancha Robledo' },
      { id: 5, name: 'Cancha Envigado' }
    ]);

    const availRes = await request(app)
      .get('/api/courts/1/availability?date=2099-11-15')
      .set('Authorization', `Bearer ${token}`);
    expect(availRes.status).toBe(200);
    expect(availRes.body.slots).toHaveLength(24);

    // Bloques 0..6 (00:00 a 06:00) y 22..23 (22:00 a 23:00) están deshabilitados
    for (const hour of [0, 1, 2, 3, 4, 5, 6, 22, 23]) {
      expect(availRes.body.slots[hour].isOperatingHour).toBe(false);
      expect(availRes.body.slots[hour].status).toBe('No habilitado');
    }

    // Bloques 7..21 (07:00 - 08:00 hasta 21:00 - 22:00) están habilitados
    for (let hour = 7; hour <= 21; hour++) {
      expect(availRes.body.slots[hour].isOperatingHour).toBe(true);
      expect(availRes.body.slots[hour].status).toBe('Disponible');
      expect(availRes.body.slots[hour].isPast).toBe(false);
    }

    expect(availRes.body.slots[7].label).toBe('07:00 - 08:00');
    expect(availRes.body.slots[21].label).toBe('21:00 - 22:00');
    expect(availRes.body.slots[22].label).toBe('22:00 - 23:00');

    // Rechaza intentos de reservar en horas deshabilitadas (ej. 06:00 o 22:00) -> 400 Bad Request
    const bookAt6Am = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ courtId: 1, date: '2099-11-15', startHour: 6 });
    expect(bookAt6Am.status).toBe(400);
    expect(bookAt6Am.body.error).toContain('07:00 a 22:00');

    const bookAt10Pm = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ courtId: 1, date: '2099-11-15', startHour: 22 });
    expect(bookAt10Pm.status).toBe(400);
    expect(bookAt10Pm.body.error).toContain('07:00 a 22:00');

    const pastAvailRes = await request(app)
      .get('/api/courts/1/availability?date=2020-01-01')
      .set('Authorization', `Bearer ${token}`);
    expect(pastAvailRes.status).toBe(200);
    expect(
      pastAvailRes.body.slots.every(
        (s: { isPast: boolean }) => s.isPast === true
      )
    ).toBe(true);
  });

  it('US1: previene colisiones (double-booking 409) y restringe a 1 reserva futura activa por usuario (409)', async () => {
    const user1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'u1@padel.com', password: 'password123' });
    const user2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'u2@padel.com', password: 'password123' });

    const token1 = user1.body.token as string;
    const token2 = user2.body.token as string;

    // Usuario 1 reserva Cancha Laureles (1) el 2099-12-01 a las 14:00
    const book1 = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token1}`)
      .send({ courtId: 1, date: '2099-12-01', startHour: 14 });
    expect(book1.status).toBe(201);
    expect(book1.body.reservation.timeSlot).toBe('14:00 - 15:00');

    // Usuario 2 intenta reservar el mismo bloque -> 409 Conflict (Colisión)
    const collisionRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token2}`)
      .send({ courtId: 1, date: '2099-12-01', startHour: 14 });
    expect(collisionRes.status).toBe(409);
    expect(collisionRes.body.error).toContain('reservada');

    // Usuario 1 intenta reservar otro bloque teniendo ya una reserva futura activa -> 409 Conflict
    const secondBookingUser1 = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token1}`)
      .send({ courtId: 2, date: '2099-12-02', startHour: 10 });
    expect(secondBookingUser1.status).toBe(409);
    expect(secondBookingUser1.body.error).toContain('reserva activa');

    // Rechaza reservas en el pasado -> 400 Bad Request
    const pastBookingUser2 = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token2}`)
      .send({ courtId: 1, date: '2020-05-10', startHour: 14 });
    expect(pastBookingUser2.status).toBe(400);
  });

  it('US3: gestiona Mis Reservas (futuras vs pasadas en hora exacta de inicio), impide cancelar reservas de terceros y libera el turno al cancelar', async () => {
    const user1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jugadorA@padel.com', password: 'password123' });
    const user2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jugadorB@padel.com', password: 'password123' });

    const userId1 = user1.body.user.id as number;
    const token1 = user1.body.token as string;
    const token2 = user2.body.token as string;

    // Simulamos reloj a las 13:30 del 2026-10-25
    const mockNowBefore14 = new Date(2026, 9, 25, 13, 30, 0);
    const created = createReservation(
      userId1,
      3,
      '2026-10-25',
      14,
      mockNowBefore14
    );
    expect(created.status).toBe(201);
    const reservationId = (created.body.reservation as { id: number }).id;

    // Antes de las 14:00 figura como upcoming
    const before14List = getUserReservations(userId1, mockNowBefore14);
    expect(before14List.upcoming).toHaveLength(1);
    expect(before14List.past).toHaveLength(0);

    // Exactamente a las 14:00 pasa al historial de pasadas y ya no se puede cancelar
    const mockNowAt14 = new Date(2026, 9, 25, 14, 0, 0);
    const at14List = getUserReservations(userId1, mockNowAt14);
    expect(at14List.upcoming).toHaveLength(0);
    expect(at14List.past).toHaveLength(1);
    expect(at14List.past[0].courtName).toBe('Cancha Belén');

    const cancelAt14 = cancelReservation(userId1, reservationId, mockNowAt14);
    expect(cancelAt14.status).toBe(400);

    // Ahora creamos una reserva futura en 2099-12-10 a las 16:00 vía HTTP
    const futureBook = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token1}`)
      .send({ courtId: 4, date: '2099-12-10', startHour: 16 });
    expect(futureBook.status).toBe(201);
    const futureId = futureBook.body.reservation.id as number;

    // Usuario 2 no puede cancelar la reserva del Usuario 1 (401)
    const unauthorizedCancel = await request(app)
      .delete(`/api/reservations/${futureId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(unauthorizedCancel.status).toBe(401);

    // Usuario 1 cancela su reserva futura -> se elimina por completo y libera el bloque
    const cancelRes = await request(app)
      .delete(`/api/reservations/${futureId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(cancelRes.status).toBe(200);

    const myResAfterCancel = await request(app)
      .get('/api/reservations/my')
      .set('Authorization', `Bearer ${token1}`);
    expect(myResAfterCancel.body.upcoming).toHaveLength(0);

    // El bloque 16:00 vuelve a estar Disponible
    const availAfter = await request(app)
      .get('/api/courts/4/availability?date=2099-12-10')
      .set('Authorization', `Bearer ${token1}`);
    expect(availAfter.body.slots[16].status).toBe('Disponible');
  });
});
