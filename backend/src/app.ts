import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { loginUser, registerUser, requireAuth } from './auth';
import { getCourtAvailability, getCourts } from './courts';
import {
  cancelReservation,
  createReservation,
  getUserReservations
} from './reservations';
import type { AuthenticatedRequest } from './types';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const result = registerUser(req.body?.email, req.body?.password);
    res.status(result.status).json(result.body);
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const result = loginUser(req.body?.email, req.body?.password);
    res.status(result.status).json(result.body);
  });

  app.get(
    '/api/auth/me',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ user: req.user });
    }
  );

  app.get(
    '/api/courts',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({ courts: getCourts() });
    }
  );

  app.get(
    '/api/courts/:courtId/availability',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const courtId = Number(req.params.courtId);
      const dateStr = typeof req.query.date === 'string' ? req.query.date : '';
      const result = getCourtAvailability(courtId, dateStr);
      res.status(result.status).json(result.body);
    }
  );

  app.post(
    '/api/reservations',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const result = createReservation(
        userId,
        req.body?.courtId,
        req.body?.date,
        req.body?.startHour
      );
      res.status(result.status).json(result.body);
    }
  );

  app.get(
    '/api/reservations/my',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const reservations = getUserReservations(userId);
      res.status(200).json(reservations);
    }
  );

  app.delete(
    '/api/reservations/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const reservationId = Number(req.params.id);
      const result = cancelReservation(userId, reservationId);
      res.status(result.status).json(result.body);
    }
  );

  app.use(
    (_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      res.status(400).json({
        error: 'Ocurrió un problema al procesar tu solicitud. Verifica los datos enviados'
      });
    }
  );

  return app;
};
