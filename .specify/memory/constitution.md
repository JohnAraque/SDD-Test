<!--
Sync Impact Report
- Version change: 0.0.0 (template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Catálogo Cerrado de Canchas
  - [PRINCIPLE_2_NAME] → II. Prevención de Colisiones (Double-Booking) (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Autenticación Obligatoria y Bloques de 24 Horas
  - [PRINCIPLE_4_NAME] → IV. Simplicidad Arquitectónica y Estilo Funcional
  - [PRINCIPLE_5_NAME] → V. Cero Código Sombra y Especificación como Fuente de la Verdad
- Added sections:
  - Naturaleza del Proyecto y Stack Tecnológico
  - Estándares de Manejo de Errores y Validaciones
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (compatible via Constitution Check)
  - ✅ .specify/templates/spec-template.md (compatible)
  - ✅ .specify/templates/tasks-template.md (compatible)
- Follow-up TODOs: None
-->

# Constitución del Proyecto: Sistema de Reservas de Pádel

## Core Principles

### I. Catálogo Cerrado de Canchas
El sistema DEBE manejar única y exclusivamente 5 canchas fijas: **Cancha Laureles**, **Cancha El Poblado**, **Cancha Belén**, **Cancha Robledo**, y **Cancha Envigado**. No se permite la creación dinámica, edición ni eliminación de canchas fuera de este catálogo cerrado.
*Rationale*: Garantizar la integridad del dominio acotado del club de pádel sin introducir complejidad administrativa innecesaria.

### II. Prevención de Colisiones (Double-Booking) (NON-NEGOTIABLE)
Bajo ninguna circunstancia se DEBE escribir una reserva en la base de datos sin validar primero que la cancha seleccionada esté libre en ese horario exacto. La validación de disponibilidad DEBE ser atómica y obligatoria antes de persistir cualquier registro de reserva.
*Rationale*: Es la regla crítica de negocio; una doble reserva destruye la confianza operativa del sistema.

### III. Autenticación Obligatoria y Bloques de 24 Horas
Todo flujo de reserva EXIGE que exista un usuario con sesión activa verificada. Las reservas DEBEN operar estrictamente en formato de 24 horas para todos los bloques de tiempo manejados por el sistema.
*Rationale*: Asegurar la trazabilidad de cada reserva hacia un usuario responsable y evitar ambigüedades horarias (AM/PM).

### IV. Simplicidad Arquitectónica y Estilo Funcional
El proyecto DEBE mantener una estructura plana dividida únicamente en `/frontend`, `/backend`, y `/db`, evitando sobreingeniería, "Clean Architecture" o patrones complejos. Se DEBE priorizar la programación funcional y los componentes funcionales (Hooks en React), evitando el uso de clases salvo que sea estrictamente obligatorio. La nomenclatura DEBE seguir `camelCase` para funciones/variables y `PascalCase` para Interfaces/Tipos.
*Rationale*: Reducir la fricción cognitiva y mantener una base de código ligera, directa y fácil de mantener.

### V. Cero Código Sombra y Especificación como Fuente de la Verdad
El agente de IA DEBE construir estrictamente lo documentado en `spec.md`, sin añadir características "por si acaso" (sin pasarelas de pago, perfiles complejos, etc.). Si una instrucción del usuario contradice esta constitución o se detecta una falla lógica, el agente DEBE detenerse, advertir del problema y solicitar actualizar `spec.md` antes de modificar el código fuente.
*Rationale*: Prevenir la desviación de alcance (*scope creep*) y asegurar que el código refleje fielmente la especificación acordada.

## Naturaleza del Proyecto y Stack Tecnológico

Esta es una aplicación para la reserva de canchas de pádel cuyo propósito es permitir a los usuarios autenticarse y gestionar reservas de tiempo en espacios específicos bajo las siguientes reglas inmutables de implementación:

- **Lenguaje:** TypeScript DEBE utilizarse en todo el stack.
- **Frontend / UI:** React utilizando Tailwind CSS para los estilos.
- **Backend:** Node.js con Express.
- **Base de Datos:** SQLite local (archivo `padel.db`). NO se deben usar ORMs pesados para mantener la simplicidad; se DEBE utilizar `better-sqlite3` o sentencias SQL puras.

## Estándares de Manejo de Errores y Validaciones

- **UI (Frontend):** NUNCA exponer errores crudos o *stack traces* al usuario final. Todo error técnico DEBE traducirse a un mensaje amigable y claro en español (ej: `"La cancha ya fue reservada en este horario"`).
- **API (Backend):** DEBE retornar siempre códigos de estado HTTP semánticos:
  - `400 Bad Request` para peticiones o formatos inválidos.
  - `401 Unauthorized` para acciones sin sesión autenticada.
  - `409 Conflict` para intentos de reserva en horarios ya ocupados (colisión).

## Governance

Esta constitución tiene precedencia sobre cualquier otra práctica o convención de desarrollo en el repositorio.

1. **Procedimiento de Enmienda:** Cualquier cambio a las reglas de negocio, stack tecnológico o principios arquitectónicos requiere actualizar primero este documento (`.specify/memory/constitution.md`) y sincronizar `spec.md` antes de alterar el código fuente.
2. **Política de Versionado:** Se aplica versionado semántico (`MAJOR.MINOR.PATCH`):
   - `MAJOR`: Eliminación o redefinición incompatible de principios de negocio o cambios en el stack base.
   - `MINOR`: Adición de nuevos principios, secciones o expansión sustancial de reglas operativas.
   - `PATCH`: Aclaraciones de redacción, correcciones tipográficas o refinamientos no semánticos.
3. **Verificación de Cumplimiento:** Toda especificación (`spec.md`), plan de implementación (`plan.md`) y lista de tareas (`tasks.md`) DEBE validar su alineación con estos 5 principios fundamentales antes de ejecutarse.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
