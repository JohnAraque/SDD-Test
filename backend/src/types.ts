import type { Request } from 'express';

export type CourtName =
  | 'Cancha Laureles'
  | 'Cancha El Poblado'
  | 'Cancha Belén'
  | 'Cancha Robledo'
  | 'Cancha Envigado';

export interface Court {
  id: number;
  name: CourtName;
}

export interface User {
  id: number;
  email: string;
  createdAt?: string;
}

export interface Reservation {
  id: number;
  userId: number;
  courtId: number;
  courtName: CourtName;
  date: string;
  startHour: number;
  timeSlot: string;
  createdAt: string;
}

export interface TimeSlotAvailability {
  startHour: number;
  label: string;
  status: 'Disponible' | 'Reservado';
  isPast: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}
