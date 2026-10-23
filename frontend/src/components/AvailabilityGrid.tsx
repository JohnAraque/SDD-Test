import React, { useState } from 'react';
import type { Court, Reservation, TimeSlotAvailability } from '../types';

export interface AvailabilityGridProps {
  court: Court | undefined;
  date: string;
  slots: TimeSlotAvailability[];
  activeReservation: Reservation | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onConfirmReservation: (startHour: number) => Promise<void>;
}

export const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
  court,
  date,
  slots,
  activeReservation,
  isLoading,
  isSubmitting,
  onConfirmReservation
}) => {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotAvailability | null>(
    null
  );

  const handleConfirm = async () => {
    if (!selectedSlot) {
      return;
    }
    const hourToBook = selectedSlot.startHour;
    setSelectedSlot(null);
    await onConfirmReservation(hourToBook);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            2. Grilla de Horarios (24 Horas) — {court ? court.name : 'Cancha'}
          </h2>
          <p className="text-sm text-slate-600">
            Fecha seleccionada: <span className="font-medium text-slate-900">{date}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Disponible
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Reservado
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Horario transcurrido (Solo lectura)
          </span>
        </div>
      </div>

      {activeReservation && (
        <div className="mb-5 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
          <span className="font-semibold">Reserva activa actual:</span> Tienes un turno próximo en{' '}
          <span className="font-semibold">{activeReservation.courtName}</span> el día{' '}
          <span className="font-semibold">{activeReservation.date}</span> a las{' '}
          <span className="font-semibold">{activeReservation.timeSlot}</span>. Recuerda que solo puedes tener 1 reserva futura activa a la vez.
        </div>
      )}

      {selectedSlot && court && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">
              Confirmar reserva de bloque de 1 hora
            </h3>
            <p className="text-sm text-emerald-800 mt-0.5">
              Cancha: <span className="font-semibold">{court.name}</span> · Fecha:{' '}
              <span className="font-semibold">{date}</span> · Horario:{' '}
              <span className="font-semibold">{selectedSlot.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setSelectedSlot(null)}
              className="rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Cargando disponibilidad de la cancha...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {slots.map((slot) => {
            const isReserved = slot.status === 'Reservado';
            const isDisabled = slot.isPast || isReserved || isSubmitting;
            const isCurrentlySelected =
              selectedSlot?.startHour === slot.startHour;

            let cardClasses =
              'bg-emerald-50/60 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-900 cursor-pointer';
            if (isCurrentlySelected) {
              cardClasses =
                'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-400 cursor-pointer';
            } else if (isReserved) {
              cardClasses =
                'bg-rose-50/70 border-rose-200 text-rose-900 opacity-85 cursor-not-allowed';
            } else if (slot.isPast) {
              cardClasses =
                'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed';
            }

            return (
              <button
                key={slot.startHour}
                type="button"
                disabled={isDisabled}
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${cardClasses}`}
              >
                <div className="font-mono text-sm font-semibold">
                  {slot.label}
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span
                    className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${
                      isCurrentlySelected
                        ? 'bg-emerald-700 text-white'
                        : isReserved
                        ? 'bg-rose-100 text-rose-800'
                        : slot.isPast
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {slot.status}
                  </span>
                  {slot.isPast && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Pasado
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
