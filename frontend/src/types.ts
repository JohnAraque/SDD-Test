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
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Reservation {
  id: number;
  userId?: number;
  courtId: number;
  courtName: CourtName;
  date: string;
  startHour: number;
  timeSlot: string;
  createdAt?: string;
}

export interface TimeSlotAvailability {
  startHour: number;
  label: string;
  status: 'Disponible' | 'Reservado' | 'No habilitado';
  isPast: boolean;
  isOperatingHour: boolean;
}

export interface AvailabilityResponse {
  court: Court;
  date: string;
  slots: TimeSlotAvailability[];
}

export interface MyReservationsResponse {
  upcoming: Reservation[];
  past: Reservation[];
}
