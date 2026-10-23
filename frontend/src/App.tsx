import React, { useCallback, useEffect, useState } from 'react';
import {
  apiCancelReservation,
  apiCreateReservation,
  apiGetAvailability,
  apiGetCourts,
  apiGetCurrentUser,
  apiGetMyReservations,
  apiLogin,
  apiRegister
} from './api';
import { AuthForm } from './components/AuthForm';
import { AvailabilityGrid } from './components/AvailabilityGrid';
import { CourtSelector } from './components/CourtSelector';
import { MyReservations } from './components/MyReservations';
import type { Court, Reservation, TimeSlotAvailability, User } from './types';

const getTodayLocalString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tokenStorageKey = 'padel_auth_token';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(tokenStorageKey)
  );
  const [user, setUser] = useState<User | null>(null);
  const [isInitializingAuth, setIsInitializingAuth] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'explore' | 'my-reservations'>(
    'explore'
  );
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalString);
  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<
    Reservation[]
  >([]);
  const [pastReservations, setPastReservations] = useState<Reservation[]>([]);

  const [isLoadingAvailability, setIsLoadingAvailability] =
    useState<boolean>(false);
  const [isLoadingReservations, setIsLoadingReservations] =
    useState<boolean>(false);
  const [isSubmittingBooking, setIsSubmittingBooking] =
    useState<boolean>(false);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setCourts([]);
    setSlots([]);
    setUpcomingReservations([]);
    setPastReservations([]);
    setFeedbackBanner(null);
  }, []);

  useEffect(() => {
    const verifyStoredSession = async () => {
      if (!token) {
        setIsInitializingAuth(false);
        return;
      }
      try {
        const { user: verifiedUser } = await apiGetCurrentUser(token);
        setUser(verifiedUser);
      } catch {
        handleLogout();
      } finally {
        setIsInitializingAuth(false);
      }
    };
    void verifyStoredSession();
  }, [token, handleLogout]);

  const loadMyReservations = useCallback(
    async (activeToken: string) => {
      setIsLoadingReservations(true);
      try {
        const data = await apiGetMyReservations(activeToken);
        setUpcomingReservations(data.upcoming);
        setPastReservations(data.past);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar tus reservas';
        setFeedbackBanner({ type: 'error', text: msg });
      } finally {
        setIsLoadingReservations(false);
      }
    },
    []
  );

  const loadAvailability = useCallback(
    async (activeToken: string, courtId: number, dateStr: string) => {
      setIsLoadingAvailability(true);
      try {
        const data = await apiGetAvailability(activeToken, courtId, dateStr);
        setSlots(data.slots);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la disponibilidad';
        setFeedbackBanner({ type: 'error', text: msg });
      } finally {
        setIsLoadingAvailability(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    const loadInitialCatalogAndReservations = async () => {
      try {
        const { courts: fetchedCourts } = await apiGetCourts(token);
        setCourts(fetchedCourts);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el catálogo de canchas';
        setFeedbackBanner({ type: 'error', text: msg });
      }
      await loadMyReservations(token);
    };
    void loadInitialCatalogAndReservations();
  }, [token, user, loadMyReservations]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    void loadAvailability(token, selectedCourtId, selectedDate);
  }, [token, user, selectedCourtId, selectedDate, loadAvailability]);

  const handleLogin = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    localStorage.setItem(tokenStorageKey, response.token);
    setToken(response.token);
    setUser(response.user);
    setFeedbackBanner(null);
  };

  const handleRegister = async (email: string, password: string) => {
    const response = await apiRegister(email, password);
    localStorage.setItem(tokenStorageKey, response.token);
    setToken(response.token);
    setUser(response.user);
    setFeedbackBanner(null);
  };

  const handleConfirmReservation = async (startHour: number) => {
    if (!token) {
      return;
    }
    setIsSubmittingBooking(true);
    setFeedbackBanner(null);
    try {
      const { reservation } = await apiCreateReservation(
        token,
        selectedCourtId,
        selectedDate,
        startHour
      );
      setFeedbackBanner({
        type: 'success',
        text: `¡Reserva confirmada en ${reservation.courtName} para el ${reservation.date} (${reservation.timeSlot})!`
      });
      await Promise.all([
        loadAvailability(token, selectedCourtId, selectedDate),
        loadMyReservations(token)
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No fue posible confirmar la reserva';
      setFeedbackBanner({ type: 'error', text: msg });
      await loadAvailability(token, selectedCourtId, selectedDate);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    if (!token) {
      return;
    }
    setFeedbackBanner(null);
    try {
      const { message } = await apiCancelReservation(token, reservationId);
      setFeedbackBanner({ type: 'success', text: message });
      await Promise.all([
        loadMyReservations(token),
        loadAvailability(token, selectedCourtId, selectedDate)
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No fue posible cancelar la reserva';
      setFeedbackBanner({ type: 'error', text: msg });
    }
  };

  if (isInitializingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">
        Verificando sesión...
      </div>
    );
  }

  if (!token || !user) {
    return <AuthForm onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const activeReservation =
    upcomingReservations.length > 0 ? upcomingReservations[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Club de Pádel — Reservas
            </h1>
            <p className="text-xs text-slate-500">
              Sesión activa: <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('explore');
                setFeedbackBanner(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Explorar Canchas
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('my-reservations');
                setFeedbackBanner(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my-reservations'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mis Reservas
              {upcomingReservations.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === 'my-reservations'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {upcomingReservations.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {feedbackBanner && (
          <div
            role="alert"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <span>{feedbackBanner.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-semibold underline ml-4 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {activeTab === 'explore' ? (
          <>
            <CourtSelector
              courts={courts}
              selectedCourtId={selectedCourtId}
              selectedDate={selectedDate}
              todayStr={getTodayLocalString()}
              onSelectCourt={setSelectedCourtId}
              onSelectDate={setSelectedDate}
            />
            <AvailabilityGrid
              court={selectedCourt}
              date={selectedDate}
              slots={slots}
              activeReservation={activeReservation}
              isLoading={isLoadingAvailability}
              isSubmitting={isSubmittingBooking}
              onConfirmReservation={handleConfirmReservation}
            />
          </>
        ) : (
          <MyReservations
            upcoming={upcomingReservations}
            past={pastReservations}
            isLoading={isLoadingReservations}
            onCancelReservation={handleCancelReservation}
          />
        )}
      </main>
    </div>
  );
};
