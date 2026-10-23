# Phase 1 API Contracts: Sistema de Reservas de Canchas de Pádel

**Feature**: `001-padel-court-booking`  
**Base URL**: `http://localhost:3000/api`  
**Content-Type**: `application/json`

## Convenciones Constitucionales de Respuesta y Errores

- **Mensajes de error**: Todos los errores devuelven un objeto JSON `{ "error": "<Mensaje amigable en español>" }`. Nunca se exponen *stack traces* ni errores internos de SQLite al cliente.
- **Códigos HTTP semánticos obligatorios**:
  - `200 OK` / `201 Created`: Operación exitosa.
  - `400 Bad Request`: Datos faltantes, formato inválido, cancha fuera del rango 1..5, intento de reservar en fecha/hora pasada o intento de cancelar una reserva pasada.
  - `401 Unauthorized`: Ausencia de sesión activa, token inválido o credenciales incorrectas.
  - `409 Conflict`: Colisión de horario (`"La cancha ya fue reservada en este horario"`), usuario ya cuenta con una reserva futura activa (`"Solo puedes tener una reserva activa a la vez"`), o correo duplicado en registro.

---

## 1. Autenticación (`/api/auth`)

### `POST /api/auth/register`
Registra un nuevo usuario e inicia su sesión activa (`FR-001`).

- **Request Body**:
  ```json
  {
    "email": "jugador@clubpadel.com",
    "password": "miPassword123"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "token": "<jwt_or_session_token>",
      "user": {
        "id": 1,
        "email": "jugador@clubpadel.com"
      }
    }
    ```
  - `400 Bad Request`: `{ "error": "Debes proporcionar un correo electrónico válido y una contraseña de al menos 6 caracteres" }`
  - `409 Conflict`: `{ "error": "El correo electrónico ya está registrado" }`

### `POST /api/auth/login`
Inicia sesión con correo electrónico y contraseña (`FR-002`).

- **Request Body**:
  ```json
  {
    "email": "jugador@clubpadel.com",
    "password": "miPassword123"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "token": "<jwt_or_session_token>",
      "user": {
        "id": 1,
        "email": "jugador@clubpadel.com"
      }
    }
    ```
  - `400 Bad Request`: `{ "error": "Debes ingresar correo electrónico y contraseña" }`
  - `401 Unauthorized`: `{ "error": "Correo electrónico o contraseña incorrectos" }`

### `GET /api/auth/me`
Verifica la sesión activa a partir del encabezado `Authorization: Bearer <token>` (`FR-003`).

- **Responses**:
  - `200 OK`: `{ "user": { "id": 1, "email": "jugador@clubpadel.com" } }`
  - `401 Unauthorized`: `{ "error": "Debes iniciar sesión para realizar esta acción" }`

---

## 2. Exploración de Canchas y Disponibilidad (`/api/courts`)

> **Requiere autenticación (`Authorization: Bearer <token>`)** — Retorna `401 Unauthorized` si no hay sesión activa (`FR-003`).

### `GET /api/courts`
Retorna el catálogo cerrado e inmutable de las 5 canchas (`FR-004`).

- **Responses**:
  - `200 OK`:
    ```json
    {
      "courts": [
        { "id": 1, "name": "Cancha Laureles" },
        { "id": 2, "name": "Cancha El Poblado" },
        { "id": 3, "name": "Cancha Belén" },
        { "id": 4, "name": "Cancha Robledo" },
        { "id": 5, "name": "Cancha Envigado" }
      ]
    }
    ```

### `GET /api/courts/:courtId/availability?date=YYYY-MM-DD`
Retorna la grilla de 24 bloques de 1 hora (`00:00` a `23:00`) para la cancha y fecha seleccionadas (`FR-005`, `FR-006`, `FR-007`), donde los bloques de `07:00 - 08:00` a `21:00 - 22:00` (`startHour` `7..21`) son horarios operativos (`isOperatingHour: true`, con estado `"Disponible"` o `"Reservado"`) y los bloques de `22:00` a `06:00` (`startHour` `0..6` y `22..23`) están deshabilitados (`isOperatingHour: false`, `status: "No habilitado"`).

- **Query Params**: `date` en formato `YYYY-MM-DD`.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "court": { "id": 1, "name": "Cancha Laureles" },
      "date": "2026-10-24",
      "slots": [
        {
          "startHour": 0,
          "label": "00:00 - 01:00",
          "status": "No habilitado",
          "isPast": false,
          "isOperatingHour": false
        },
        {
          "startHour": 7,
          "label": "07:00 - 08:00",
          "status": "Disponible",
          "isPast": false,
          "isOperatingHour": true
        },
        {
          "startHour": 14,
          "label": "14:00 - 15:00",
          "status": "Reservado",
          "isPast": false,
          "isOperatingHour": true
        },
        {
          "startHour": 22,
          "label": "22:00 - 23:00",
          "status": "No habilitado",
          "isPast": false,
          "isOperatingHour": false
        }
      ]
    }
    ```
  - `400 Bad Request`: `{ "error": "Cancha o formato de fecha inválido (use YYYY-MM-DD)" }`
  - `401 Unauthorized`: `{ "error": "Debes iniciar sesión para consultar la disponibilidad" }`

---

## 3. Creación y Gestión de Reservas (`/api/reservations`)

> **Requiere autenticación (`Authorization: Bearer <token>`)** — Retorna `401 Unauthorized` si no hay sesión activa (`FR-003`).

### `POST /api/reservations`
Crea una nueva reserva de 1 hora tras validar atómicamente disponibilidad, horario operativo (`startHour` entre `7` y `21`, es decir `07:00 - 22:00`), horario futuro y límite de 1 reserva activa por usuario (`FR-008`, `FR-009`, `FR-010`, `FR-011`).

- **Request Body**:
  ```json
  {
    "courtId": 1,
    "date": "2026-10-24",
    "startHour": 14
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "reservation": {
        "id": 10,
        "userId": 1,
        "courtId": 1,
        "courtName": "Cancha Laureles",
        "date": "2026-10-24",
        "startHour": 14,
        "timeSlot": "14:00 - 15:00",
        "createdAt": "2026-10-23 13:40:00"
      }
    }
    ```
  - `400 Bad Request`:
    - `{ "error": "El horario seleccionado está fuera del horario habilitado (07:00 a 22:00)" }`
    - `{ "error": "No se pueden realizar reservas en fechas u horarios que ya han transcurrido" }`
    - `{ "error": "Los datos de la reserva son inválidos" }`
  - `401 Unauthorized`: `{ "error": "Debes iniciar sesión para realizar una reserva" }`
  - `409 Conflict`:
    - Colisión de horario: `{ "error": "La cancha ya fue reservada en este horario" }`
    - Límite de 1 reserva activa: `{ "error": "Ya tienes una reserva activa. Solo puedes tener una reserva futura a la vez" }`

### `GET /api/reservations/my`
Obtiene exclusivamente las reservas del usuario autenticado divididas en reservas futuras (`upcoming`) e historial de reservas pasadas (`past`) (`FR-012`, `FR-013`, `FR-015`).

- **Responses**:
  - `200 OK`:
    ```json
    {
      "upcoming": [
        {
          "id": 10,
          "courtId": 1,
          "courtName": "Cancha Laureles",
          "date": "2026-10-24",
          "startHour": 14,
          "timeSlot": "14:00 - 15:00"
        }
      ],
      "past": [
        {
          "id": 4,
          "courtId": 2,
          "courtName": "Cancha El Poblado",
          "date": "2026-10-20",
          "startHour": 18,
          "timeSlot": "18:00 - 19:00"
        }
      ]
    }
    ```

### `DELETE /api/reservations/:id`
Cancela (elimina por completo) una reserva futura perteneciente al usuario autenticado (`FR-014`, `FR-015`).

- **Responses**:
  - `200 OK`:
    ```json
    {
      "message": "Reserva cancelada exitosamente"
    }
    ```
  - `400 Bad Request`: `{ "error": "No es posible cancelar una reserva que ya ha iniciado o transcurrido" }`
  - `401 Unauthorized`: `{ "error": "No tienes permiso para cancelar esta reserva" }`
  - `404 Not Found` / `400 Bad Request`: `{ "error": "La reserva no existe o no pertenece a tu cuenta" }`
