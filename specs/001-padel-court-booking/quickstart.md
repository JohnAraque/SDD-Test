# Quickstart & Validation Guide: Sistema de Reservas de Canchas de Pádel

**Feature**: `001-padel-court-booking`  
**Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md) | **API Contracts**: [contracts/api.md](./contracts/api.md)

## 1. Prerrequisitos

- **Node.js**: v20+ LTS y `npm`
- **Sistema Operativo**: Windows / macOS / Linux (SQLite local embebido vía `better-sqlite3`, sin servidores de base de datos externos).

## 2. Estructura del Repositorio e Instalación

El proyecto sigue la arquitectura plana obligatoria de la Constitución (`/db`, `/backend`, `/frontend`):

```powershell
# 1. Instalar dependencias del backend (incluye acceso a /db/padel.db)
cd backend
npm install

# 2. Instalar dependencias del frontend
cd ../frontend
npm install
```

## 3. Ejecución en Desarrollo

```powershell
# Terminal 1: Iniciar servidor Backend (Express + SQLite en http://localhost:3000)
cd backend
npm run dev

# Terminal 2: Iniciar cliente Frontend (React + Vite + Tailwind en http://localhost:5173)
cd frontend
npm run dev
```

Al iniciar el backend por primera vez, el módulo `/db` inicializa automáticamente el archivo `db/padel.db` con las tablas `users` y `reservations` y el catálogo fijo de las 5 canchas.

## 4. Ejecución de Pruebas Automatizadas

```powershell
# Ejecutar pruebas de integración y concurrencia del backend
cd backend
npm test
```

## 5. Escenarios de Validación End-to-End

1. **Control de Acceso y Autenticación (`US2`)**:
   - Abrir `http://localhost:5173` sin sesión activa → Verificar que se solicita iniciar sesión o registrarse antes de mostrar la disponibilidad.
   - Registrar el Usuario A (`usuario1@padel.com`) → Verificar que ingresa automáticamente al panel principal y visualiza las 5 canchas (`Cancha Laureles`, `Cancha El Poblado`, `Cancha Belén`, `Cancha Robledo`, `Cancha Envigado`).
2. **Exploración de Grilla 24h y Modo Solo Lectura en Pasado (`US1`, `FR-005`..`FR-007`)**:
   - Seleccionar `Cancha Laureles` y una fecha pasada en el calendario → Verificar que se muestran los 24 bloques (`00:00 - 01:00` a `23:00 - 00:00`) todos deshabilitados en modo solo lectura.
   - Seleccionar la fecha actual → Verificar que las horas ya transcurridas aparecen deshabilitadas y las horas futuras aparecen como `"Disponible"` o `"Reservado"`.
3. **Reserva Exitosa y Límite de 1 Reserva Activa (`US1`, `FR-008`, `FR-010`)**:
   - Seleccionar un bloque futuro `"Disponible"` (ej. mañana a las `14:00 - 15:00`) y confirmar → El bloque pasa a `"Reservado"`.
   - Intentar reservar un segundo bloque futuro con el mismo Usuario A → El sistema rechaza la operación (`409 Conflict`) mostrando `"Ya tienes una reserva activa. Solo puedes tener una reserva futura a la vez"`.
4. **Prevención de Colisiones / Double-Booking (`US1`, `FR-009`)**:
   - Iniciar sesión con el Usuario B (`usuario2@padel.com`) e intentar reservar el mismo bloque (`Cancha Laureles`, mañana `14:00 - 15:00`) → El sistema rechaza la operación (`409 Conflict`) con `"La cancha ya fue reservada en este horario"`.
5. **Gestión y Cancelación en `"Mis Reservas"` (`US3`, `FR-012`..`FR-015`)**:
   - Con el Usuario A, abrir `"Mis Reservas"` → Verificar que aparece la reserva en `Cancha Laureles`, fecha de mañana y hora `14:00 - 15:00` bajo reservas futuras.
   - Cancelar la reserva y confirmar → Verificar que la reserva se elimina de `"Mis Reservas"`, el bloque `14:00 - 15:00` vuelve a mostrarse `"Disponible"` en la grilla y el Usuario A puede crear una nueva reserva inmediatamente.
