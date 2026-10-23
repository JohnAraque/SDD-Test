import type {
  AuthResponse,
  AvailabilityResponse,
  Court,
  MyReservationsResponse,
  Reservation,
  User
} from './types';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const requestJson = async <T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & T;

    if (!response.ok) {
      throw new Error(
        data.error || 'Ocurrió un problema inesperado al comunicarse con el servidor'
      );
    }

    return data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'Failed to fetch') {
        throw new Error(
          'No se pudo conectar con el servidor. Verifica que el servicio esté activo.'
        );
      }
      throw err;
    }
    throw new Error('Error inesperado en la comunicación con el servidor');
  }
};

export const apiRegister = (
  email: string,
  password: string
): Promise<AuthResponse> =>
  requestJson<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

export const apiLogin = (
  email: string,
  password: string
): Promise<AuthResponse> =>
  requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

export const apiGetCurrentUser = (
  token: string
): Promise<{ user: User }> =>
  requestJson<{ user: User }>('/auth/me', { method: 'GET' }, token);

export const apiGetCourts = (
  token: string
): Promise<{ courts: Court[] }> =>
  requestJson<{ courts: Court[] }>('/courts', { method: 'GET' }, token);

export const apiGetAvailability = (
  token: string,
  courtId: number,
  date: string
): Promise<AvailabilityResponse> =>
  requestJson<AvailabilityResponse>(
    `/courts/${courtId}/availability?date=${encodeURIComponent(date)}`,
    { method: 'GET' },
    token
  );

export const apiCreateReservation = (
  token: string,
  courtId: number,
  date: string,
  startHour: number
): Promise<{ reservation: Reservation }> =>
  requestJson<{ reservation: Reservation }>(
    '/reservations',
    {
      method: 'POST',
      body: JSON.stringify({ courtId, date, startHour })
    },
    token
  );

export const apiGetMyReservations = (
  token: string
): Promise<MyReservationsResponse> =>
  requestJson<MyReservationsResponse>('/reservations/my', { method: 'GET' }, token);

export const apiCancelReservation = (
  token: string,
  reservationId: number
): Promise<{ message: string }> =>
  requestJson<{ message: string }>(
    `/reservations/${reservationId}`,
    { method: 'DELETE' },
    token
  );
