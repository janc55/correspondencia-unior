# Contrato de API v1 — Sistema de Correspondencia UNIOR

Base URL de desarrollo: `http://localhost:3001/api/v1`
Documentación interactiva (Swagger): `http://localhost:3001/api/docs`
Todas las fechas son ISO-8601 en UTC. La zona horaria institucional es `America/La_Paz` (UTC-4) y se usa solo para presentación.

## Autenticación

Cabecera: `Authorization: Bearer <accessToken>`.
Token de acceso de vida corta (1 h por defecto) + refresh token rotativo (7 días). El refresh se guarda en base de datos y se revoca al usarlo o al cerrar sesión.

### POST /auth/login

```json
{ "email": "admin@unior.edu.bo", "password": "Unior2026*" }
```

Respuesta `200`:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "b7f...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "name": "Ana Quispe",
    "email": "admin@unior.edu.bo",
    "role": "ADMIN",
    "active": true,
    "department": { "id": "uuid", "name": "Rectorado", "code": "RECTORADO" },
    "lastLoginAt": "2026-02-10T12:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Credenciales inválidas → `401` con código `INVALID_CREDENTIALS`. Usuario inactivo → `403` `USER_INACTIVE`.

### POST /auth/refresh

```json
{ "refreshToken": "b7f..." }
```

Devuelve el mismo payload que el login (rotación: el refresh anterior queda revocado). Token inválido/expirado/revocado → `401` `INVALID_REFRESH_TOKEN`.

### POST /auth/logout

```json
{ "refreshToken": "b7f..." }
```

`204`. Idempotente.

### GET /users/me

`200` → objeto `user` (misma forma que en login).

## Reglas de autorización

| Rol            | Alcance                                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN`        | Todo: usuarios, configuración, auditoría, todas las correspondencias.                                                                                       |
| `RECEPCION`    | Registrar correspondencia y anexos, consultar todas las correspondencias del sistema, ver demoras.                                                          |
| `DESTINATARIO` | Solo las correspondencias donde tiene un tramo asignado (por usuario o por su departamento). Puede registrar recepción, clasificación y salida de su tramo. |
| `SEGUIMIENTO`  | Consulta global de correspondencias, demoras y auditoría. No registra ni modifica trámites.                                                                 |

Un acceso fuera de alcance devuelve `403` con código `FORBIDDEN_SCOPE`. Un recurso inexistente devuelve `404` `NOT_FOUND`.

## Formato de error

```json
{
  "statusCode": 422,
  "code": "INVALID_TRANSITION",
  "message": "No se puede despachar un tramo que aún no fue clasificado.",
  "details": null,
  "requestId": "c0ffee...",
  "timestamp": "2026-02-10T12:00:00.000Z",
  "path": "/api/v1/route-recipients/uuid/dispatch"
}
```

Códigos usados: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `USER_INACTIVE`, `INVALID_REFRESH_TOKEN`, `UNAUTHORIZED`, `FORBIDDEN_SCOPE`, `NOT_FOUND`, `INVALID_TRANSITION`, `CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `INTERNAL_ERROR`.

## Catálogos

### GET /departments

`200` → `[{ "id": "uuid", "name": "Rectorado", "code": "RECTORADO", "active": true }]`.
Disponible para cualquier usuario autenticado (se usa en formularios).

## Correspondencias

### POST /correspondences

Roles: `ADMIN`, `RECEPCION`.

```json
{
  "direction": "EXTERNA",
  "subject": "Solicitud de constancia de estudios",
  "summary": "Estudiante solicita constancia para trámite externo.",
  "senderName": "Juan Pérez Mamani",
  "senderOrganization": "Ministerio de Educación",
  "senderReference": "CITE: MINEDU-2026-0451",
  "recipients": [
    { "departmentId": "uuid", "internalNotes": "Revisar antecedentes" },
    { "userId": "uuid" }
  ]
}
```

- `recipients`: 1 a 3 elementos, orden = secuencia. Cada elemento debe tener `userId` o `departmentId` (no ambos obligatorios; si vienen ambos se usa `userId`).
- `subject`: 5–200 caracteres. `senderName`: 3–120. `summary`: hasta 1000.
- El servidor genera el correlativo (`COR-2026-000012`), las fechas y un código de verificación público.

Respuesta `201`:

```json
{
  "correspondence": { "...": "detalle completo (ver GET /correspondences/:id)" },
  "publicAccess": {
    "trackingNumber": "COR-2026-000012",
    "code": "7K4M-9QTX",
    "expiresAt": null
  }
}
```

`publicAccess.code` se muestra **una sola vez** (se almacena solo su hash). La UI debe permitir copiarlo/imprimirlo.

### GET /correspondences

Roles: todos los internos (el resultado se filtra por alcance).
Query: `page` (1), `pageSize` (10, máx. 100), `search` (correlativo, asunto o remitente), `status` (`REGISTRADA|EN_TRAMITE|ATENDIDA|ARCHIVADA`), `direction` (`INTERNA|EXTERNA`), `from` / `to` (fecha ISO `YYYY-MM-DD`), `overdue` (`true`), `mine` (`true` = solo mis tramos asignados).

```json
{
  "data": [
    {
      "id": "uuid",
      "trackingNumber": "COR-2026-000012",
      "direction": "EXTERNA",
      "subject": "Solicitud de constancia de estudios",
      "senderName": "Juan Pérez Mamani",
      "senderOrganization": "Ministerio de Educación",
      "registeredAt": "2026-02-10T12:00:00.000Z",
      "currentStatus": "EN_TRAMITE",
      "isArchived": false,
      "recipientsTotal": 2,
      "recipientsCompleted": 1,
      "hasOverdueSegment": true
    }
  ],
  "meta": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1 }
}
```

### GET /correspondences/:id · GET /correspondences/by-number/:number

`200` → detalle:

```json
{
  "id": "uuid",
  "trackingNumber": "COR-2026-000012",
  "year": 2026,
  "sequence": 12,
  "direction": "EXTERNA",
  "subject": "Solicitud de constancia de estudios",
  "summary": "...",
  "senderName": "Juan Pérez Mamani",
  "senderOrganization": "Ministerio de Educación",
  "senderReference": "CITE: MINEDU-2026-0451",
  "registeredAt": "2026-02-10T12:00:00.000Z",
  "currentStatus": "EN_TRAMITE",
  "isArchived": false,
  "createdBy": { "id": "uuid", "name": "Rosa Ventanilla" },
  "routeSheet": {
    "id": "uuid",
    "createdAt": "2026-02-10T12:00:00.000Z",
    "recipients": [
      {
        "id": "uuid",
        "sequence": 1,
        "status": "DESPACHADO",
        "action": "PREPARAR_RESPUESTA",
        "receivedAt": "2026-02-10T13:00:00.000Z",
        "classifiedAt": "2026-02-10T13:10:00.000Z",
        "dispatchedAt": "2026-02-10T15:00:00.000Z",
        "internalNotes": "Revisar antecedentes",
        "assignee": {
          "type": "USER",
          "id": "uuid",
          "name": "Luis Abogado",
          "department": "Asesoría Jurídica"
        },
        "durationMinutes": 120,
        "isOverdue": false,
        "overdueHours": 0,
        "canAct": false
      }
    ]
  },
  "attachments": [
    {
      "id": "uuid",
      "originalName": "solicitud.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 152334,
      "checksum": "sha256...",
      "createdAt": "2026-02-10T12:00:00.000Z",
      "uploadedBy": { "id": "uuid", "name": "Rosa Ventanilla" }
    }
  ],
  "events": [
    {
      "id": "uuid",
      "eventType": "REGISTRO",
      "fromStatus": null,
      "toStatus": "REGISTRADA",
      "occurredAt": "2026-02-10T12:00:00.000Z",
      "actor": { "id": "uuid", "name": "Rosa Ventanilla" },
      "recipientSequence": null
    }
  ],
  "publicTracking": {
    "hasActiveToken": true,
    "expiresAt": null,
    "createdAt": "2026-02-10T12:00:00.000Z"
  },
  "metrics": { "elapsedHours": 26, "overdueSegments": 1, "thresholdHours": 24 }
}
```

`canAct`: `true` cuando el usuario autenticado puede operar ese tramo en su estado actual.
`assignee.type`: `"USER"` o `"DEPARTMENT"`; `department` es el nombre del departamento.

### POST /correspondences/:id/attachments

Roles: `ADMIN`, `RECEPCION` (y el destinatario del tramo activo).
`multipart/form-data`, campo `file` (máx. 10 MB). Permitidos: PDF, JPG/JPEG, PNG.
Respuesta `201` → objeto attachment.

### GET /attachments/:id/download

Roles: quien tenga acceso a la correspondencia. Devuelve el binario con `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff`. Nunca se sirve por URL pública.

### POST /correspondences/:id/archive

Roles: `ADMIN`, `SEGUIMIENTO`. Cuerpo `{ "reason": "texto opcional" }`. `200` → detalle. Correspondencia archivada pasa a `ARCHIVADA` (borrado lógico).

### POST /correspondences/:id/public-code

Roles: `ADMIN`, `RECEPCION`, `SEGUIMIENTO`. Rota el código público (revoca el anterior). `200`:

```json
{ "trackingNumber": "COR-2026-000012", "code": "7K4M-9QTX", "expiresAt": null }
```

## Tramos (hoja de ruta)

### GET /route-recipients/mine

`200` → tramos asignados al usuario (por usuario o por su departamento), ordenados por fecha de registro descendente:

```json
[
  {
    "id": "uuid",
    "sequence": 1,
    "status": "PENDIENTE",
    "action": null,
    "receivedAt": null,
    "dispatchedAt": null,
    "internalNotes": "Revisar antecedentes",
    "canAct": true,
    "allowedActions": ["receive"],
    "correspondence": {
      "id": "uuid",
      "trackingNumber": "COR-2026-000012",
      "subject": "Solicitud de constancia de estudios",
      "direction": "EXTERNA",
      "senderName": "Juan Pérez",
      "senderOrganization": "Ministerio de Educación",
      "registeredAt": "2026-02-10T12:00:00.000Z",
      "currentStatus": "EN_TRAMITE"
    },
    "waitingHours": 27,
    "isOverdue": true
  }
]
```

Query opcional: `status` (`PENDIENTE|RECIBIDO|CLASIFICADO|DESPACHADO`), `pending=true`.

### POST /route-recipients/:id/receive

Sin cuerpo. Solo el destinatario autorizado (o `ADMIN`). El servidor fija `receivedAt`.
`200` → `{ "recipient": { "...": "tramo" }, "correspondenceStatus": "EN_TRAMITE" }`.
Estado inválido → `422` `INVALID_TRANSITION`.

### PATCH /route-recipients/:id/action

```json
{ "action": "URGENTE" }
```

`URGENTE | ARCHIVAR | PREPARAR_RESPUESTA`. Requiere recepción previa; el servidor fija `classifiedAt` y `status = CLASIFICADO`.
`200` → `{ "recipient": {...}, "correspondenceStatus": "EN_TRAMITE" }`.

### POST /route-recipients/:id/dispatch

```json
{ "internalNotes": "Respuesta remitida a ventanilla" }
```

Requiere clasificación previa; el servidor fija `dispatchedAt` y `status = DESPACHADO`. Si todos los tramos están despachados, la correspondencia pasa a `ATENDIDA`.
`200` → `{ "recipient": {...}, "correspondenceStatus": "ATENDIDA" }`.

## Seguimiento y demoras

### GET /tracking/overdue

Roles: `ADMIN`, `RECEPCION`, `SEGUIMIENTO`.
Devuelve tramos abiertos (pendientes/recibidos/clasificados) cuyo tiempo supera el umbral (`OVERDUE_THRESHOLD_HOURS`, 24 h por defecto):

```json
{
  "thresholdHours": 24,
  "data": [
    {
      "correspondenceId": "uuid",
      "trackingNumber": "COR-2026-000005",
      "subject": "Informe de laboratorio",
      "recipientId": "uuid",
      "recipientSequence": 2,
      "status": "RECIBIDO",
      "assigneeName": "Asesoría Jurídica",
      "since": "2026-02-09T12:00:00.000Z",
      "hoursElapsed": 31,
      "isOverdue": true
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

### GET /tracking/stats

Roles: todos los internos. `200`:

```json
{
  "total": 128,
  "byStatus": { "REGISTRADA": 4, "EN_TRAMITE": 23, "ATENDIDA": 98, "ARCHIVADA": 3 },
  "overdue": 6,
  "registeredToday": 9,
  "averageAttentionHours": 18.5,
  "thresholdHours": 24
}
```

### GET /tracking/public?number=COR-2026-000012&code=7K4M-9QTX

Público, sin token. Límite: 10 intentos/minuto por IP (`429` `RATE_LIMITED`).
Respuesta `200` **mínima** (sin remitente, asunto ni nombres):

```json
{
  "trackingNumber": "COR-2026-000012",
  "publicStatus": "EN_CURSO",
  "publicStatusLabel": "En curso",
  "registeredAt": "2026-02-10T12:00:00.000Z",
  "lastMovementAt": "2026-02-10T15:00:00.000Z",
  "recipients": [
    {
      "sequence": 1,
      "statusLabel": "Finalizado",
      "receivedAt": "2026-02-10T13:00:00.000Z",
      "dispatchedAt": "2026-02-10T15:00:00.000Z"
    },
    { "sequence": 2, "statusLabel": "Pendiente", "receivedAt": null, "dispatchedAt": null }
  ]
}
```

`publicStatus`: `RECIBIDO | EN_CURSO | FINALIZADO | ARCHIVADO`.
Número inexistente o código incorrecto → `404` `NOT_FOUND` con el mismo mensaje genérico `"No se encontró una correspondencia con los datos proporcionados."` (no revelar cuál dato falló).

## Auditoría

### GET /audit

Roles: `ADMIN`, `SEGUIMIENTO`.
Query: `page`, `pageSize` (20, máx. 100), `action`, `entityType`, `actorId`, `from`, `to`.

```json
{
  "data": [
    {
      "id": "uuid",
      "action": "correspondence.create",
      "entityType": "Correspondence",
      "entityId": "uuid",
      "occurredAt": "2026-02-10T12:00:00.000Z",
      "requestId": "uuid",
      "ip": "127.0.0.1",
      "actor": { "id": "uuid", "name": "Rosa Ventanilla", "role": "RECEPCION" }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

## Administración de usuarios

### GET /users?page&pageSize&search&role&active

Rol: `ADMIN`. `200` → `{ data: [user], meta }` (misma forma de usuario, sin `passwordHash`).

### POST /users

Rol: `ADMIN`.

```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@unior.edu.bo",
  "password": "Unior2026*",
  "role": "DESTINATARIO",
  "departmentId": "uuid"
}
```

`201` → usuario. Email duplicado → `409` `CONFLICT`.

### PATCH /users/:id

Rol: `ADMIN`. Campos parciales: `name`, `role`, `departmentId` (`null` para quitar), `active`.

### POST /users/:id/reset-password

Rol: `ADMIN`. `{ "password": "NuevaClave2026*" }` → `204`.

## Notificaciones

### GET /notifications?status&page&pageSize

Rol: `ADMIN`. Historial de envíos (correo, plantilla, estado, intentos, error).

### POST /tracking/overdue/notify

Roles: `ADMIN`, `SEGUIMIENTO`. Revisa demoras y envía alerta al equipo de seguimiento; no bloquea si SMTP falla (devuelve `sent/failed/skipped`).

```json
{ "checked": 6, "sent": 0, "failed": 0, "skipped": 6 }
```

Si `SMTP_HOST` está vacío, los envíos quedan `OMITIDO` y `skipped` los cuenta.

## Catálogo de etiquetas (para la UI)

- `Role`: ADMIN → Administrador · RECEPCION → Recepción / Ventanilla · DESTINATARIO → Destinatario interno · SEGUIMIENTO → Seguimiento / Secretaría.
- `CorrespondenceStatus`: REGISTRADA → Registrada · EN_TRAMITE → En trámite · ATENDIDA → Atendida · ARCHIVADA → Archivada.
- `RouteRecipientStatus`: PENDIENTE → Pendiente · RECIBIDO → Recibido · CLASIFICADO → Clasificado · DESPACHADO → Despachado.
- `RecipientAction`: URGENTE → Urgente · ARCHIVAR → Archivar · PREPARAR_RESPUESTA → Preparar respuesta.
- `Direction`: INTERNA → Interna · EXTERNA → Externa.
- `TrackingEventType`: REGISTRO · RECEPCION · CLASIFICACION · DESPACHO · ANEXO · ARCHIVADO · CONSULTA_PUBLICA · NOTIFICACION · ACTUALIZACION.

## Usuarios semilla de desarrollo (no productivos)

| Email                      | Contraseña   | Rol          | Departamento        |
| -------------------------- | ------------ | ------------ | ------------------- |
| `admin@unior.edu.bo`       | `Unior2026*` | ADMIN        | Rectorado           |
| `recepcion@unior.edu.bo`   | `Unior2026*` | RECEPCION    | Ventanilla Única    |
| `seguimiento@unior.edu.bo` | `Unior2026*` | SEGUIMIENTO  | Secretaría General  |
| `juridico@unior.edu.bo`    | `Unior2026*` | DESTINATARIO | Asesoría Jurídica   |
| `academico@unior.edu.bo`   | `Unior2026*` | DESTINATARIO | Dirección Académica |
| `rrhh@unior.edu.bo`        | `Unior2026*` | DESTINATARIO | Recursos Humanos    |
