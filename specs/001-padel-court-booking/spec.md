# Feature Specification: Sistema de Reservas de Canchas de Pádel

**Feature Branch**: `001-padel-court-booking`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Sistema de reservas de canchas de pádel con autenticación de usuarios por correo y contraseña, exploración y selección de 5 canchas estáticas en bloques de 1 hora (formato 24h), creación de reservas con prevención de colisiones y límite de 1 reserva activa por usuario, y panel de gestión de reservas propias (futuras y pasadas con cancelación)."

## Clarifications

### Session 2026-10-23

- Q: ¿Qué debe ocurrir con una reserva futura cuando el usuario la cancela desde el panel "Mis Reservas"? (FR-012, FR-014) → A: Eliminarla por completo: desaparece de "Mis Reservas" y el bloque horario queda inmediatamente libre.
- Q: ¿En qué momento exacto una reserva deja de considerarse "futura/activa" y pasa al historial de "reservas pasadas"? (FR-010, FR-012) → A: Al iniciar el bloque horario (ej. a las `14:00` para el bloque `14:00 - 15:00`): se puede cancelar hasta antes de las `14:00` y desde las `14:00` pasa al historial.
- Q: ¿Cómo deben comportarse el selector de fechas (calendario) y la grilla de 24 horas frente a fechas y horas que ya han transcurrido? (FR-005, FR-007, FR-011) → A: El calendario permite navegar a fechas pasadas en modo solo lectura (todos los bloques deshabilitados), y en el día actual las horas pasadas también aparecen deshabilitadas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exploración de Disponibilidad y Creación de Reservas (Priority: P1)

Un jugador con sesión activa desea consultar la disponibilidad de una de las 5 canchas del club para una fecha determinada y reservar un bloque de 1 hora disponible para asegurar su turno de juego, garantizando que no existan dobles reservas ni reservas en horarios pasados.

**Why this priority**: Es la propuesta de valor central del sistema. Sin la capacidad de visualizar horarios disponibles y asegurar un turno libre de colisiones, el sistema no cumple su propósito operativo.

**Independent Test**: Se puede probar de forma independiente iniciando sesión con un usuario sin reservas activas, seleccionando una cancha (ej. Cancha Laureles) y una fecha válida, eligiendo un bloque de 1 hora marcado como "Disponible" y confirmando la reserva, verificando que el bloque pase a estado "Reservado".

**Acceptance Scenarios**:

1. **Given** un usuario con sesión activa y sin reservas futuras activas, **When** selecciona una de las 5 canchas (Cancha Laureles, Cancha El Poblado, Cancha Belén, Cancha Robledo o Cancha Envigado) y una fecha en el calendario, **Then** el sistema muestra la grilla de 24 horas dividida en bloques enteros de 1 hora (00:00 a 23:00) indicando claramente cuáles están "Disponibles" y cuáles "Reservados".
2. **Given** un usuario con sesión activa y sin reservas activas visualizando un bloque horario futuro "Disponible" (ej. 14:00 a 15:00), **When** selecciona dicho bloque y confirma la reserva, **Then** el sistema valida que el turno siga libre, registra la reserva y actualiza el estado del bloque a "Reservado".
3. **Given** dos usuarios visualizando simultáneamente el mismo bloque horario "Disponible", **When** el primer usuario confirma la reserva y segundos después el segundo usuario intenta confirmar el mismo bloque, **Then** el sistema rechaza la solicitud del segundo usuario informando con un mensaje claro en español que la cancha ya fue reservada en ese horario.
4. **Given** un usuario con sesión activa que ya posee una reserva futura activa, **When** intenta crear una nueva reserva en cualquier cancha u horario, **Then** el sistema impide la creación y muestra un mensaje claro indicando que solo se permite tener una reserva activa a la vez.
5. **Given** un usuario con sesión activa, **When** intenta seleccionar o confirmar un bloque cuya fecha u hora de inicio ya ha transcurrido, **Then** el sistema rechaza o deshabilita la acción impidiendo reservas en el pasado.

---

### User Story 2 - Autenticación y Control de Acceso de Usuarios (Priority: P2)

Un usuario nuevo o recurrente necesita registrarse e iniciar sesión mediante su correo electrónico y contraseña para poder acceder a la disponibilidad completa de las canchas y gestionar exclusivamente sus propias reservas.

**Why this priority**: Es un requisito habilitador obligatorio por reglas del negocio; toda reserva requiere trazabilidad hacia un usuario autenticado y protección para que ningún tercero altere reservas ajenas.

**Independent Test**: Se puede probar registrando una cuenta nueva con correo y contraseña, cerrando sesión, verificando que un visitante sin sesión no pueda ver la grilla de disponibilidad ni reservar, y volviendo a iniciar sesión para confirmar el acceso.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta en el sistema, **When** completa el formulario de registro con un correo electrónico válido no registrado previamente y una contraseña, **Then** el sistema crea su cuenta e inicia su sesión activa.
2. **Given** un usuario registrado sin sesión iniciada, **When** ingresa sus credenciales válidas (correo y contraseña), **Then** el sistema autentica al usuario y le permite visualizar la disponibilidad completa y realizar reservas.
3. **Given** un visitante sin sesión activa, **When** intenta acceder a la disponibilidad de canchas o ejecutar una acción de reserva, **Then** el sistema bloquea la visualización/acción y solicita iniciar sesión.
4. **Given** un usuario autenticado, **When** intenta consultar o cancelar una reserva perteneciente a otro usuario, **Then** el sistema rechaza la operación garantizando que cada usuario solo gestione sus propias reservas.

---

### User Story 3 - Gestión de Mis Reservas (Futuras e Historial) (Priority: P3)

Un usuario autenticado desea consultar en un panel personal tanto sus reservas próximas como su historial de reservas pasadas, y poder cancelar su reserva futura si ya no puede asistir, liberando así el horario para otros jugadores y recuperando su cupo para reservar otro turno.

**Why this priority**: Completa el ciclo de vida de la reserva y permite que los usuarios bloqueados por la regla de "máximo 1 reserva activa" puedan liberar su turno de forma autónoma sin intervención administrativa.

**Independent Test**: Se puede probar accediendo al panel "Mis Reservas" con un usuario que tenga reservas pasadas y una reserva futura activa, verificando los datos mostrados (Cancha, Fecha y Hora) y cancelando la reserva futura para comprobar que el horario vuelve a estar "Disponible".

**Acceptance Scenarios**:

1. **Given** un usuario con sesión activa, **When** accede al panel "Mis Reservas", **Then** visualiza dos listados diferenciados: sus reservas futuras activas y su historial de reservas pasadas, mostrando en cada ítem el Nombre de la cancha, la Fecha y la Hora (en formato 24 horas).
2. **Given** un usuario en su panel "Mis Reservas" con una reserva futura activa, **When** selecciona la opción de cancelar dicha reserva y confirma la acción, **Then** la reserva se cancela, el bloque horario vuelve a mostrarse como "Disponible" en la grilla de esa cancha y fecha, y el usuario queda habilitado inmediatamente para realizar una nueva reserva.
3. **Given** un usuario en su panel "Mis Reservas" visualizando una reserva cuya fecha y hora ya transcurrieron, **When** consulta el detalle del ítem en su historial, **Then** el sistema no permite cancelarla por tratarse de un evento pasado.

---

### Edge Cases

- **Colisión concurrente (Race Condition):** Si dos usuarios hacen clic en confirmar sobre la misma cancha, fecha y bloque horario casi al mismo instante, el sistema debe garantizar que exactamente uno tenga éxito y el otro reciba un mensaje claro de rechazo por conflicto de disponibilidad.
- **Transición de reserva activa a pasada:** Cuando la fecha y hora de una reserva activa transcurren sin haber sido cancelada, la reserva pasa automáticamente a considerarse parte del historial pasado y el usuario queda habilitado para crear una nueva reserva futura.
- **Cambio de hora durante la visualización:** Si un usuario abre la grilla a las 13:59 viendo el bloque `14:00 - 15:00` como futuro e intenta confirmarlo a las 14:01, el sistema debe rechazar la reserva porque el bloque ya ha iniciado/transcurrido.
- **Correo electrónico duplicado en registro:** Si un usuario intenta registrarse con un correo electrónico que ya existe en el sistema, debe recibir un mensaje claro en español indicando que el correo ya está registrado.
- **Intento de reserva múltiple:** Si un usuario con una reserva futura activa abre otra pestaña e intenta confirmar una segunda reserva, el sistema debe re-validar su estado al momento de confirmar y rechazar la solicitud.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los usuarios registrarse proporcionando un correo electrónico único y una contraseña.
- **FR-002**: El sistema DEBE permitir a los usuarios registrados iniciar y cerrar sesión mediante su correo electrónico y contraseña.
- **FR-003**: El sistema DEBE restringir la visualización de la disponibilidad completa de canchas y la creación o gestión de reservas exclusivamente a usuarios con una sesión activa verificada.
- **FR-004**: El sistema DEBE listar de forma estática e inmutable exactamente las siguientes 5 canchas: **Cancha Laureles**, **Cancha El Poblado**, **Cancha Belén**, **Cancha Robledo** y **Cancha Envigado**.
- **FR-005**: El sistema DEBE permitir al usuario autenticado seleccionar una cancha del catálogo y cualquier fecha específica en un calendario (incluyendo fechas pasadas en modo de consulta/solo lectura) para visualizar la grilla horaria.
- **FR-006**: Para la cancha y fecha seleccionadas, el sistema DEBE presentar una grilla de 24 horas dividida en 24 bloques enteros de 1 hora en formato de 24 horas (`00:00 - 01:00`, `01:00 - 02:00`, ..., `23:00 - 00:00`).
- **FR-007**: El sistema DEBE indicar visual y explícitamente el estado de cada bloque horario como `"Disponible"` o `"Reservado"`, mostrando deshabilitados (en modo solo lectura / no seleccionables) todos los bloques de fechas pasadas y las horas ya transcurridas del día actual.
- **FR-008**: El sistema DEBE permitir a un usuario autenticado seleccionar un único bloque horario `"Disponible"` (de 1 hora exacta) y confirmar su reserva.
- **FR-009**: Antes de persistir una reserva, el sistema DEBE re-validar de manera atómica que la cancha seleccionada siga libre en esa fecha y bloque horario; en caso de que otro usuario haya tomado el turno, DEBE rechazar la reserva y mostrar un mensaje de error claro en español (prevención de colisiones).
- **FR-010**: El sistema DEBE validar que un usuario solo pueda tener **una (1) reserva futura activa a la vez** (definida como aquella cuya fecha y hora de inicio aún no han llegado); si el usuario ya cuenta con una reserva futura activa, el sistema DEBE impedir la creación de una nueva reserva hasta que alcance su hora de inicio o sea cancelada.
- **FR-011**: El sistema DEBE rechazar cualquier intento de crear una reserva en una fecha pasada o en un bloque horario cuya hora de inicio ya haya llegado o transcurrido respecto al momento de la confirmación.
- **FR-012**: El sistema DEBE proporcionar un panel de `"Mis Reservas"` donde el usuario autenticado visualice exclusivamente sus propias reservas, separadas en reservas futuras (cuya hora de inicio es posterior al momento actual) e historial de reservas pasadas (cuya hora de inicio es igual o anterior al momento actual).
- **FR-013**: Cada elemento en el panel `"Mis Reservas"` DEBE mostrar obligatoriamente: **Nombre de la cancha**, **Fecha** y **Hora** (en formato 24 horas).
- **FR-014**: El sistema DEBE permitir al usuario cancelar cualquiera de sus reservas futuras activas (únicamente antes de su hora de inicio) previa confirmación de la acción, eliminando por completo el registro de la reserva (desaparece de `"Mis Reservas"`), liberando inmediatamente el bloque horario para otros usuarios y permitiendo al usuario volver a reservar.
- **FR-015**: El sistema DEBE impedir que un usuario visualice, modifique o cancele reservas pertenecientes a terceros.

### Out of Scope (Non-Goals)

- **NG-001**: Pasarela de pagos integrados (todo pago se gestiona presencialmente en el club).
- **NG-002**: Panel de administración web para crear, editar o eliminar canchas.
- **NG-003**: Notificaciones externas (sin correos transaccionales, SMS ni WhatsApp).
- **NG-004**: Selección o reserva de más de 1 hora continua en un solo clic (además, regido por el límite de 1 reserva activa por usuario).
- **NG-005**: Sistema de "matchmaking" para buscar compañeros de juego o gestión de torneos.

### Key Entities *(include if feature involves data)*

- **Usuario**: Representa a la persona registrada en el sistema. Atributos clave: identificador único, correo electrónico (único), credenciales de contraseña protegidas y fecha de creación.
- **Cancha**: Representa cada uno de los 5 espacios deportivos fijos del club (`Cancha Laureles`, `Cancha El Poblado`, `Cancha Belén`, `Cancha Robledo`, `Cancha Envigado`). Es un catálogo cerrado e inmutable.
- **Reserva**: Representa la asignación vigente o histórica de una cancha a un usuario en una fecha y bloque horario específico de 1 hora. Atributos clave: identificador único, usuario propietario, cancha seleccionada, fecha de la reserva (`YYYY-MM-DD`), hora de inicio/bloque en formato 24h (`00:00` a `23:00`) y marca de tiempo de creación (las reservas canceladas se eliminan de forma definitiva).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los usuarios autenticados pueden explorar la disponibilidad de una cancha y completar una reserva válida en menos de 1 minuto.
- **SC-002**: El sistema mantiene un **0% de reservas duplicadas (doble reserva / colisión)** para una misma cancha, fecha y bloque horario, incluso ante intentos simultáneos de confirmación.
- **SC-003**: El **100% de los intentos** de reservar un segundo turno teniendo ya una reserva futura activa, o de reservar en horarios pasados, son bloqueados e informados con un mensaje comprensible en español sin exponer detalles técnicos.
- **SC-004**: Al cancelar una reserva futura, el bloque horario vuelve a estar disponible para cualquier usuario y el cupo del jugador se libera de forma inmediata (en menos de 2 segundos).

## Assumptions

- **Definición de "Reserva Activa"**: Se considera reserva activa a toda reserva vigente cuya fecha y hora de inicio aún no se han cumplido (por ejemplo, para el bloque `14:00 - 15:00`, es activa hasta las `13:59:59`). Al llegar exactamente la hora de inicio (`14:00`), la reserva pasa automáticamente al historial de reservas pasadas, ya no puede cancelarse y deja de bloquear nuevas reservas del usuario.
- **Cancelación de Reservas**: Cuando un usuario cancela una reserva futura, el registro se elimina por completo del sistema; no se conserva un historial de reservas canceladas, liberando el turno en la grilla de disponibilidad y el cupo activo del usuario de inmediato.
- **Zona Horaria de Referencia**: Todas las validaciones de fechas y bloques horarios pasados o futuros utilizan la hora local del club (Colombia, UTC-5 / hora local del servidor-cliente).
- **Resolución de Regla de 1 Hora vs Límite de 1 Reserva Activa**: Aunque en los Non-Goals se menciona que no habrá reservas de más de 1 hora en un solo clic, prevalece la regla explícita de negocio de que **un usuario solo puede tener una reserva activa a la vez**.
