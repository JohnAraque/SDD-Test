import React from 'react';
import type { Court } from '../types';

export interface CourtSelectorProps {
  courts: Court[];
  selectedCourtId: number;
  selectedDate: string;
  todayStr: string;
  onSelectCourt: (courtId: number) => void;
  onSelectDate: (date: string) => void;
}

export const CourtSelector: React.FC<CourtSelectorProps> = ({
  courts,
  selectedCourtId,
  selectedDate,
  todayStr,
  onSelectCourt,
  onSelectDate
}) => {
  const isPastDate = selectedDate < todayStr;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            1. Selecciona Cancha y Fecha
          </h2>
          <p className="text-sm text-slate-600">
            Explora nuestras 5 sedes disponibles en bloques de 1 hora (formato 24h)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="booking-date"
            className="text-sm font-medium text-slate-700"
          >
            Fecha de consulta:
          </label>
          <input
            id="booking-date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                onSelectDate(e.target.value);
              }
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {isPastDate && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          Estás consultando una fecha pasada ({selectedDate}). Todos los bloques se muestran en modo de solo lectura.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {courts.map((court) => {
          const isSelected = court.id === selectedCourtId;
          return (
            <button
              key={court.id}
              type="button"
              onClick={() => onSelectCourt(court.id)}
              className={`text-left rounded-xl p-4 border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'
              }`}
            >
              <div
                className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                Sede #{court.id}
              </div>
              <div className="font-semibold text-sm">{court.name}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
