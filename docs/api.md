# API REST v1 — resumen

- Base: `http://localhost:3001/api/v1`
- Swagger/OpenAPI interactivo: `http://localhost:3001/api/docs` (JSON en `/api/docs-json`)
- Contrato detallado con payloads: [`api-contract.md`](api-contract.md)
- Autenticación: `Authorization: Bearer <accessToken>`

## Convenciones

- Fechas ISO-8601 en **UTC**; presentación en `America/La_Paz`.
- Listados paginados: `page` (1), `pageSize` (10 por defecto, 100 máximo) → `{ data, meta }`.
- Errores uniformes:

```json
{
  "statusCode": 422,
  "code": "INVALID_TRANSITION",
  "message": "Debe clasificar el trámite antes de registrar la salida.",
  "details": null,
  "requestId": "…",
  "timestamp": "2026-02-10T12:00:00.000Z",
  "path": "/api/v1/route-recipients/…/dispatch"
}
```

Códigos: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `USER_INACTIVE`, `INVALID_REFRESH_TOKEN`, `UNAUTHORIZED`, `FORBIDDEN_SCOPE`, `NOT_FOUND`, `INVALID_TRANSITION`, `CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `INTERNAL_ERROR`.

Todas las respuestas incluyen `X-Request-Id`; la auditoría lo almacena para trazabilidad.

## Endpoints

| Método | Ruta                                 | Roles                             | Descripción                                     |
| ------ | ------------------------------------ | --------------------------------- | ----------------------------------------------- |
| POST   | `/auth/login`                        | público                           | Login; devuelve access + refresh + usuario.     |
| POST   | `/auth/refresh`                      | público                           | Rota el refresh token (detecta reutilización).  |
| POST   | `/auth/logout`                       | público                           | Revoca el refresh token. `204`.                 |
| GET    | `/users/me`                          | autenticado                       | Perfil con departamento.                        |
| GET    | `/users`                             | ADMIN                             | Listado paginado con búsqueda y filtros.        |
| POST   | `/users`                             | ADMIN                             | Alta de usuario.                                |
| PATCH  | `/users/:id`                         | ADMIN                             | Edita nombre, rol, departamento o estado.       |
| POST   | `/users/:id/reset-password`          | ADMIN                             | Cambia contraseña y revoca sesiones. `204`.     |
| GET    | `/departments`                       | autenticado                       | Catálogo de departamentos.                      |
| POST   | `/correspondences`                   | ADMIN, RECEPCION                  | Registro transaccional + código público.        |
| GET    | `/correspondences`                   | autenticado (filtrado por ámbito) | Búsqueda, filtros, paginación.                  |
| GET    | `/correspondences/by-number/:number` | autenticado (filtrado)            | Búsqueda interna por correlativo.               |
| GET    | `/correspondences/:id`               | autenticado (filtrado)            | Detalle con hoja de ruta, historial y métricas. |
| POST   | `/correspondences/:id/attachments`   | con acceso a la correspondencia   | Anexo `multipart/form-data` campo `file`.       |
| POST   | `/correspondences/:id/archive`       | ADMIN, SEGUIMIENTO                | Archivo lógico.                                 |
| POST   | `/correspondences/:id/public-code`   | ADMIN, RECEPCION, SEGUIMIENTO     | Rota el código público.                         |
| GET    | `/attachments/:id/download`          | con acceso a la correspondencia   | Descarga autenticada.                           |
| GET    | `/route-recipients/mine`             | autenticado                       | Tramos asignados al usuario/departamento.       |
| POST   | `/route-recipients/:id/receive`      | destinatario del tramo o ADMIN    | Recepción (fecha del servidor).                 |
| PATCH  | `/route-recipients/:id/action`       | destinatario del tramo o ADMIN    | Clasificación.                                  |
| POST   | `/route-recipients/:id/dispatch`     | destinatario del tramo o ADMIN    | Salida (fecha del servidor).                    |
| GET    | `/tracking/stats`                    | autenticado                       | Métricas del panel.                             |
| GET    | `/tracking/overdue`                  | ADMIN, RECEPCION, SEGUIMIENTO     | Tramos sobre el umbral.                         |
| POST   | `/tracking/overdue/notify`           | ADMIN, SEGUIMIENTO                | Envía alerta al equipo de seguimiento.          |
| GET    | `/tracking/public`                   | público (10/min por IP)           | Consulta externa con correlativo + código.      |
| GET    | `/audit`                             | ADMIN, SEGUIMIENTO                | Auditoría paginada y filtrable.                 |
| GET    | `/notifications`                     | ADMIN                             | Bitácora de notificaciones.                     |

## Ejemplo rápido

```bash
# Login
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"recepcion@unior.edu.bo","password":"Unior2026*"}'

# Registro (usar el token del paso anterior)
curl -s -X POST http://localhost:3001/api/v1/correspondences \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"direction":"EXTERNA","subject":"Solicitud de constancia","senderName":"Juan Pérez","recipients":[{"departmentId":"<uuid>"}]}'

# Consulta pública
curl -s 'http://localhost:3001/api/v1/tracking/public?number=COR-2026-000001&code=A7K4-9QTX'
```

Los UUID de departamentos se obtienen de `GET /departments`; los usuarios, de `GET /users` (solo ADMIN) o de la bandeja de cada destinatario.

## Límites y protecciones

- Throttling global: 300 peticiones/minuto por IP; consulta pública: 10/minuto.
- Anexos: PDF, JPG o PNG reales; máximo 10 MB (`MAX_ATTACHMENT_MB`), límite duro de 20 MB en el interceptor.
- Solo se permiten 1–3 destinatarios por hoja de ruta, en orden y sin duplicados.
- El número correlativo no es suficiente para la consulta externa: se exige el código de verificación.
