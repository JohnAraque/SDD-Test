import React, { useState } from 'react';
import type { Reservation } from '../types';

export interface MyReservationsProps {
  upcoming: Reservation[];
  past: Reservation[];
  isLoading: boolean;
  onCancelReservation: (reservationId: number) => Promise<void>;
}

export const MyReservations: React.FC<MyReservationsProps> = ({
  upcoming,
  past,
  isLoading,
  onCancelReservation
}) => {
  const [confirmingCancelId, setConfirmingCancelId] = useState<number | null>(
    null
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirmCancel = async (reservationId: number) => {
    setIsCancelling(true);
    try {
      await onCancelReservation(reservationId);
      setConfirmingCancelId(null);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-sm text-slate-500">
        Cargando tus reservas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Mis Reservas Futuras Activas
          </h2>
          <p className="text-sm text-slate-600">
            Puedes cancelar tu reserva futura antes de su hora de inicio para liberar el turno.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-600">
            No tienes reservas futuras activas en este momento.
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((res) => {
              const isConfirming = confirmingCancelId === res.id;
              return (
                <li
                  key={res.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-slate-900">
                      {res.courtName}
                    </div>
                    <div className="text-sm text-slate-700 flex flex-wrap gap-4">
                      <span>
                        <strong className="font-medium text-slate-900">Fecha:</strong>{' '}
                        {res.date}
                      </span>
                      <span>
                        <strong className="font-medium text-slate-900">Hora:</strong>{' '}
                        <span className="font-mono">{res.timeSlot}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirming ? (
                      <>
                        <span className="text-xs font-medium text-rose-800 mr-1">
                          ¿Confirmar cancelación?
                        </span>
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => handleConfirmCancel(res.id)}
                          className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                        </button>
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => setConfirmingCancelId(null)}
                          className="rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
                        >
                          No, volver
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancelId(res.id)}
                        className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Cancelar Reserva
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Historial de Reservas Pasadas
          </h2>
          <p className="text-sm text-slate-600">
            Registro de tus turnos anteriores o ya iniciados.
          </p>
        </div>

        {past.length === 0 ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-600">
            Aún no tienes reservas en tu historial pasado.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {past.map((res) => (
              <li
                key={res.id}
                className="p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    {res.courtName}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap gap-4">
                    <span>
                      <strong>Fecha:</strong> {res.date}
                    </span>
                    <span>
                      <strong>Hora:</strong>{' '}
                      <span className="font-mono">{res.timeSlot}</span>
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center self-start sm:self-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Finalizada / Pasada
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
