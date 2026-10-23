# Implementation Plan: Sistema de Reservas de Canchas de Pádel

**Branch**: `001-padel-court-booking` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-padel-court-booking/spec.md`

## Summary

Construir una aplicación web completa para la reserva de canchas de pádel que permita a los usuarios registrarse e iniciar sesión con correo y contraseña, explorar la disponibilidad de las 5 canchas fijas del club en una grilla de 24 horas (bloques de 1 hora en formato 24h), realizar reservas garantizando cero colisiones (*double-booking*) y un máximo de 1 reserva futura activa por usuario, y gestionar sus reservas propias (futuras e historial de pasadas, con eliminación inmediata al cancelar reservas futuras). La solución se implementará en TypeScript siguiendo una arquitectura plana (`/db`, `/backend`, `/frontend`) con SQLite (`better-sqlite3` sin ORM), Express y React con Tailwind CSS.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+ LTS en Backend, ES2022 en Frontend)

**Primary Dependencies**:
- **Backend**: `express`, `better-sqlite3`, `cors`, `jsonwebtoken` (o `crypto` nativo para tokens HMAC y `scrypt` para contraseñas)
- **Frontend**: `react`, `react-dom`, `vite`, `tailwindcss`

**Storage**: SQLite local en archivo `/db/padel.db` gestionado mediante `better-sqlite3` y sentencias SQL puras con transacciones `IMMEDIATE` (sin ORMs).

**Testing**: `vitest` y `supertest` para pruebas de API, reglas de negocio y concurrencia/colisiones.

**Target Platform**: Aplicación web moderna ejecutada en navegadores de escritorio y móviles (cliente React + servidor Node.js/Express).

**Project Type**: `web-application` (estructura plana en `/frontend`, `/backend` y `/db`).

**Performance Goals**: Respuesta de consultas de disponibilidad y confirmación/cancelación de reservas en `< 100ms` local (`< 2 segundos` percibidos por el usuario según `SC-004`).

**Constraints**:
- Catálogo inmutable de 5 canchas (`Cancha Laureles`, `Cancha El Poblado`, `Cancha Belén`, `Cancha Robledo`, `Cancha Envigado`).
- Validación atómica obligatoria contra *double-booking* antes de persistir reservas.
- Formato estricto de 24 horas (`00:00` a `23:00`) en bloques enteros de 1 hora, con horario habilitado para reservas de `07:00` a `22:00` (`07:00 - 08:00` hasta `21:00 - 22:00`) y bloques deshabilitados de `22:00` a `06:00` (`00:00 - 07:00` y `22:00 - 00:00`).
- Mensajes de error amigables en español en la UI y códigos HTTP semánticos (`400`, `401`, `409`) en el backend.

**Scale/Scope**: Club de pádel de 5 canchas (120 bloques horarios totales por día, 75 bloques operativos reservables por día entre `07:00` y `22:00`), diseñado para cientos de usuarios registrados y reservas concurrentes sin degradación ni colisiones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado Pre-Investigación | Estado Post-Diseño (Phase 1) | Evidencia de Cumplimiento |
| --- | --- | --- | --- |
| **I. Catálogo Cerrado de Canchas** | ✅ PASS | ✅ PASS | Exactamente las 5 canchas requeridas están fijas en `data-model.md` y `/api/courts`, sin endpoints de creación/edición/borrado de canchas. |
| **II. Prevención de Colisiones (NON-NEGOTIABLE)** | ✅ PASS | ✅ PASS | Transacción atómica `db.transaction` (`IMMEDIATE`) + `UNIQUE(court_id, date, start_hour)` en SQLite documentados en `research.md` y `data-model.md`, retornando `409 Conflict`. |
| **III. Autenticación Obligatoria y Bloques de 24 Horas** | ✅ PASS | ✅ PASS | Todos los endpoints de disponibilidad y reservas exigen sesión activa (`401 Unauthorized` si falta) y operan en formato de 24 horas (`00:00 - 01:00` a `23:00 - 00:00`), habilitando `07:00 - 22:00` y deshabilitando `22:00 - 06:00` (`00:00 - 07:00` y `22:00 - 00:00`). |
| **IV. Simplicidad Arquitectónica y Estilo Funcional** | ✅ PASS | ✅ PASS | Estructura plana dividida únicamente en `/db`, `/backend` y `/frontend`; uso de funciones puras, Hooks en React, `camelCase` para variables/funciones y `PascalCase` para interfaces/tipos. |
| **V. Cero Código Sombra y Especificación como Fuente de la Verdad** | ✅ PASS | ✅ PASS | Ninguna característica fuera de `spec.md` fue añadida (sin pagos, sin admin web, sin notificaciones externas, sin matchmaking). |
| **Stack Tecnológico y Estándares de Errores** | ✅ PASS | ✅ PASS | TypeScript en todo el stack, React + Tailwind CSS, Node.js + Express, SQLite (`padel.db` con `better-sqlite3`), errores en español y códigos HTTP `400`, `401`, `409`. |

## Project Structure

### Documentation (this feature)

```text
specs/001-padel-court-booking/
├── plan.md              # Este archivo (salida de /speckit-plan)
├── research.md          # Salida de Phase 0 (/speckit-plan)
├── data-model.md        # Salida de Phase 1 (/speckit-plan)
├── quickstart.md        # Salida de Phase 1 (/speckit-plan)
├── contracts/
│   └── api.md           # Contratos REST HTTP (/speckit-plan)
└── tasks.md             # Salida de Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
db/
├── schema.sql           # DDL puro de SQLite (users, reservations e índices UNIQUE)
├── database.ts          # Conexión better-sqlite3 a db/padel.db e inicialización automática
└── padel.db             # Archivo SQLite local (generado en ejecución)

backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── types.ts         # Interfaces PascalCase (User, Court, Reservation, TimeSlotAvailability)
│   ├── auth.ts          # Hash de contraseñas, generación/verificación de token y middleware requireAuth
│   ├── courts.ts        # Catálogo inmutable de las 5 canchas y cálculo de grilla de 24 horas
│   ├── reservations.ts  # Lógica transaccional de creación, listado (futuras/pasadas) y cancelación
│   ├── app.ts           # Configuración funcional de Express y rutas (/api/auth, /api/courts, /api/reservations)
│   └── server.ts        # Punto de entrada HTTP
└── tests/
    └── api.test.ts      # Pruebas de integración (autenticación, colisiones 409, límite de 1 reserva activa, cancelación)

frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css                 # Directivas de Tailwind CSS
    ├── types.ts                  # Tipos compartidos en PascalCase
    ├── api.ts                    # Cliente HTTP funcional con manejo de errores amigables en español
    ├── App.tsx                   # Estado de sesión y navegación entre Explorar Canchas y Mis Reservas
    └── components/
        ├── AuthForm.tsx          # Formulario funcional de Registro e Inicio de Sesión
        ├── CourtSelector.tsx     # Selector de las 5 canchas y selector de fecha (calendario con lectura de pasado)
        ├── AvailabilityGrid.tsx  # Grilla de 24 bloques (1h, formato 24h) con confirmación de reserva
        └── MyReservations.tsx    # Panel de reservas futuras (con botón de cancelar y confirmación) e historial
```

**Structure Decision**: Se adopta la estructura plana de 3 carpetas raíz (`/db`, `/backend`, `/frontend`) exigida por el Principio IV de la Constitución del Proyecto, manteniendo los módulos de código concisos, funcionales y sin capas de abstracción innecesarias.

## Complexity Tracking

> **Sin violaciones a la Constitución.** Todos los principios y restricciones se cumplen de forma nativa sin requerir excepciones.
