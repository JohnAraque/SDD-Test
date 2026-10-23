# Phase 0 Research: Sistema de Reservas de Canchas de Pádel

**Feature**: `001-padel-court-booking`  
**Date**: 2026-10-23

## 1. Prevención Atómica de Colisiones (Double-Booking) en SQLite

- **Decision**: Utilizar transacciones síncronas de `better-sqlite3` (`db.transaction(...)` en modo `IMMEDIATE`) combinadas con una restricción de unicidad a nivel de esquema `UNIQUE(court_id, date, start_hour)` en la tabla `reservations`.
- **Rationale**: `better-sqlite3` ejecuta operaciones de forma síncrona sobre el hilo de Node.js y bloquea escrituras concurrentes de forma determinista con transacciones `IMMEDIATE`. Esto permite verificar dentro de la misma transacción:
  1. Que el bloque horario no haya sido tomado por otro usuario (`SELECT` + `UNIQUE` constraint → `409 Conflict` con `"La cancha ya fue reservada en este horario"`).
  2. Que el usuario autenticado no tenga ya otra reserva futura activa (`SELECT` sobre reservas futuras del usuario → `409 Conflict` con `"Ya tienes una reserva activa. Solo puedes tener una reserva futura a la vez"`).
- **Alternatives considered**:
  - *Verificación asíncrona en dos pasos (`SELECT` seguido de `INSERT` fuera de transacción)*: Rechazada porque introduce una ventana de condición de carrera (*TOCTOU*) entre peticiones concurrentes.
  - *Uso de ORMs (Prisma/TypeORM)*: Prohibido explícitamente por la Constitución del Proyecto.

## 2. Mecanismo de Autenticación y Gestión de Sesión

- **Decision**: Autenticación basada en tokens firmados (`JWT` vía `jsonwebtoken` o token de sesión HTTP-only/Bearer) con contraseñas almacenadas mediante hash seguro (`bcryptjs` o `crypto.scrypt` nativo de Node.js).
- **Rationale**: Usar `crypto.scryptSync` / `crypto.timingSafeEqual` (o `bcryptjs`) junto con tokens firmados con `crypto.createHmac` o `jsonwebtoken` mantiene las dependencias al mínimo, permite verificar la sesión de forma funcional mediante un middleware Express (`requireAuth`) y retorna `401 Unauthorized` ante cualquier petición sin sesión activa a los endpoints de disponibilidad y reservas.
- **Alternatives considered**:
  - *Sesiones en memoria sin persistencia o texto plano*: Rechazado por inseguridad en contraseñas y pérdida de sesión en reinicios.
  - *OAuth2 / Proveedores externos*: Fuera de alcance según `spec.md` (`FR-001` especifica registro e inicio de sesión con correo electrónico y contraseña).

## 3. Manejo de Fechas, Formato 24 Horas, Horario Operativo (07:00 a 22:00) y Transición de Reserva Activa a Pasada

- **Decision**: Representar las fechas como cadenas ISO locales `YYYY-MM-DD` (ej. `"2026-10-23"`) y los bloques horarios de la grilla de 24 horas como enteros de `0` a `23` (`"00:00 - 01:00"` a `"23:00 - 00:00"`), restringiendo los bloques habilitados para reserva al rango operativo `start_hour` entre `7` y `21` inclusive (`07:00 - 08:00` a `21:00 - 22:00`, es decir, 7:00 AM a 10:00 PM) y dejando deshabilitados los bloques nocturnos/madrugada (`22:00` a `06:00`, es decir `start_hour < 7` o `start_hour > 21`).
- **Rationale**:
  - La grilla sigue mostrando las 24 horas del día en formato 24h (`FR-006`), cumpliendo con el Principio III de la Constitución, pero marca con `isOperatingHour: false` (deshabilitados en la UI) los bloques `00:00 - 07:00` (`0..6`) y `22:00 - 00:00` (`22..23`), y rechaza en el backend (`400 Bad Request`) y a nivel de base de datos (`CHECK (start_hour BETWEEN 7 AND 21)`) cualquier intento de reserva fuera de `07:00 - 22:00`.
  - Una reserva se considera **futura/activa** si y solo si: `(date > currentDate) OR (date == currentDate AND start_hour > currentHour)`.
  - Exactamente cuando el reloj alcanza `start_hour:00` del día `date` (es decir, `currentHour >= start_hour` en `date == currentDate`), el bloque ya inició/transcurrió, por lo que:
    1. No puede ser reservado (`400 Bad Request`).
    2. Si estaba reservado, pasa automáticamente al historial de reservas pasadas, no puede cancelarse (`400 Bad Request`), y libera el cupo del usuario para realizar una nueva reserva futura.
- **Alternatives considered**:
  - *Timestamps UTC completos para cada bloque*: Rechazado porque complica innecesariamente la consulta por fecha de calendario local y la validación de bloques enteros de `00:00` a `23:00`.

## 4. Estructura Plana del Proyecto y Estilo Funcional

- **Decision**: Monorepo ligero con tres directorios de nivel superior en la raíz: `/db`, `/backend`, y `/frontend`.
- **Rationale**: Cumple de manera exacta con el Principio IV de la Constitución ("estructura plana dividida únicamente en `/frontend`, `/backend`, y `/db`, evitando sobreingeniería, Clean Architecture o patrones complejos").
  - `/db`: Contiene el script de inicialización de esquema SQL puro (`schema.sql` / `init.ts`) y el archivo `padel.db`.
  - `/backend`: Servidor Express en TypeScript con funciones puras/middlewares funcionales (`auth`, `courts`, `reservations`) y pruebas automatizadas con `vitest` + `supertest`.
  - `/frontend`: Aplicación React + Vite + Tailwind CSS en TypeScript basada exclusivamente en Functional Components y React Hooks.
- **Alternatives considered**:
  - *Arquitectura hexagonal o separación en múltiples capas (controllers/use-cases/repositories/entities)*: Rechazada explícitamente por el Principio IV de la Constitución.
