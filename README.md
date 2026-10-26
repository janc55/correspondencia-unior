# UNIOR · Sistema de Registro y Seguimiento de Correspondencia

MVP funcional del sistema de correspondencia de la **Universidad Privada de Oruro (UNIOR)**: registro con correlativo único, hoja de ruta digital de hasta tres destinatarios, recepción/clasificación/salida por tramo, historial auditable, alertas de demora y consulta externa protegida.

Monolito modular NestJS + Next.js + PostgreSQL/Prisma, sin microservicios, sin Redis y sin colas: cada pieza adicional debe justificar un problema real.

---

## 1. Alcance implementado

| Requisito                                                                                      | Estado |
| ---------------------------------------------------------------------------------------------- | ------ |
| Autenticación de usuarios internos (JWT + refresh rotativo)                                    | ✅     |
| Roles y autorización por ámbito (`ADMIN`, `RECEPCION`, `DESTINATARIO`, `SEGUIMIENTO`)          | ✅     |
| Registro de correspondencia interna/externa con correlativo transaccional (`COR-AAAA-NNNNNN`)  | ✅     |
| Remitente, asunto, tipo, fecha de registro, resumen y referencia                               | ✅     |
| Hoja de ruta de 1 a 3 destinatarios ordenados (usuario o departamento)                         | ✅     |
| Recepción, clasificación (urgente/archivar/preparar respuesta) y salida por destinatario       | ✅     |
| Historial de eventos, duración por tramo y detección de demoras (> 24 h configurable)          | ✅     |
| Búsqueda interna por correlativo, filtros y paginación                                         | ✅     |
| Consulta externa con correlativo + código de verificación y límite de intentos                 | ✅     |
| Panel con métricas, bandeja personal y listado de demorados                                    | ✅     |
| Alertas de demora por correo (SMTP opcional, registro de cada envío)                           | ✅     |
| Anexos validados por contenido, almacenados fuera del directorio público y descarga autorizada | ✅     |
| Auditoría de operaciones (actor, acción, entidad, IP, request id)                              | ✅     |
| Archivo lógico (sin borrado físico de correspondencias con historial)                          | ✅     |

Fuera del MVP (según `SDD.md`): microservicios, Redis, colas/workers, E2E extenso, firma digital certificada, analítica avanzada, almacenamiento de objetos dedicado.

---

## 2. Stack y estructura

- **Backend:** NestJS 11 + TypeScript estricto, API REST versionada en `/api/v1`, Swagger en `/api/docs`.
- **Base de datos:** PostgreSQL 16+ con Prisma 6 (migraciones versionadas y seed).
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + lucide-react.
- **Autenticación:** JWT de acceso (1 h) + refresh opaco rotativo (7 días) con revocación en base de datos.
- **Archivos:** almacenamiento local abstraído (`StorageService`) para poder migrar a S3/MinIO.
- **Correo:** SMTP en el mismo proceso (nodemailer), no bloqueante.

```text
correspondencia-unior/
├── apps/
│   ├── api/                 # NestJS + Prisma (schema, migraciones y seed)
│   │   ├── prisma/
│   │   ├── src/
│   │   └── test/
│   └── web/                 # Next.js (App Router)
├── docs/                    # arquitectura, contrato de API y decisiones
├── scripts/smoke.mjs        # prueba de humo end-to-end
├── docker-compose.yml       # PostgreSQL local con healthcheck
├── .env.example
├── SDD.md                   # documento base del proyecto
└── README.md
```

> **Decisión:** no se creó un paquete `packages/shared` en esta iteración. El contrato se documenta en `docs/api-contract.md` y los tipos del cliente viven en `apps/web/src/lib/types.ts`; abstraer un paquete compartido ahora agregaría fricción de build sin beneficio concreto (el SDD lo permite explícitamente para plazos cortos).

---

## 3. Requisitos

- Node.js **22 o superior** (probado con Node 24).
- pnpm **10 o superior** (`corepack enable` o `npm i -g pnpm`).
- PostgreSQL **16+**, ya sea con Docker o una instalación local.

---

## 4. Puesta en marcha

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno (sin secretos reales en el repositorio)
cp .env.example .env
cp .env.example apps/api/.env

# 3. Base de datos
docker compose up -d postgres
#    Si ya tienes PostgreSQL local, ajusta DATABASE_URL en apps/api/.env

# 4. Cliente Prisma, esquema y datos de demostración
pnpm db:generate
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # usuarios y correspondencias de ejemplo

# 5. Aplicaciones (dos terminales)
pnpm dev:api          # http://localhost:3001/api/v1  ·  Swagger: /api/docs
pnpm dev:web          # http://localhost:3000
```

El frontend usa `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3001/api/v1`). Si cambias el puerto de la API, define esa variable en `apps/web/.env.local`.

### Variables de entorno

Todas están descritas y comentadas en `.env.example`. Las mínimas para desarrollo:

| Variable                                           | Uso                                                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                     | Conexión PostgreSQL.                                                                           |
| `JWT_ACCESS_SECRET` / `PUBLIC_VERIFICATION_SECRET` | Secretos de firma; en producción deben ser aleatorios (≥ 32 caracteres) y distintos.           |
| `OVERDUE_THRESHOLD_HOURS`                          | Umbral de demora por tramo (24 por defecto).                                                   |
| `STORAGE_DIR` / `MAX_ATTACHMENT_MB`                | Almacenamiento de anexos y tamaño máximo.                                                      |
| `SMTP_*` / `MAIL_TRACKING_TEAM`                    | Correo; si `SMTP_HOST` está vacío, los envíos se registran como `OMITIDO` sin romper el flujo. |
| `CORS_ORIGINS`                                     | Orígenes permitidos por CORS.                                                                  |

**Prisma CLI** lee `apps/api/.env`; la API lee `apps/api/.env` y, como respaldo, el `.env` de la raíz.

---

## 5. Usuarios y datos de demostración

Contraseña común de demo: **`Unior2026*`** (datos **no productivos**, creados por `apps/api/prisma/seed.ts`).

| Correo                     | Rol                    | Departamento        |
| -------------------------- | ---------------------- | ------------------- |
| `admin@unior.edu.bo`       | Administrador          | Rectorado           |
| `recepcion@unior.edu.bo`   | Recepción / Ventanilla | Ventanilla Única    |
| `seguimiento@unior.edu.bo` | Seguimiento            | Secretaría General  |
| `juridico@unior.edu.bo`    | Destinatario           | Asesoría Jurídica   |
| `academico@unior.edu.bo`   | Destinatario           | Dirección Académica |
| `rrhh@unior.edu.bo`        | Destinatario           | Recursos Humanos    |

Correspondencias de demostración (consulta externa en `/consulta`):

| Correlativo        | Código      | Estado                      |
| ------------------ | ----------- | --------------------------- |
| `COR-<año>-000001` | `A7K4-9QTX` | Atendida (2 tramos)         |
| `COR-<año>-000002` | `B3MN-7RTY` | En trámite (tramo demorado) |
| `COR-<año>-000003` | `C5PQ-2WXV` | Registrada                  |
| `COR-<año>-000004` | `D8HJ-4KLP` | En trámite                  |
| `COR-<año>-000005` | `E2RT-6NMB` | En trámite (urgente)        |

El año se calcula con la zona horaria institucional (`America/La_Paz`); el seed imprime los correlativos exactos al finalizar.

### Guion breve de demostración

1. Entrar como `recepcion@unior.edu.bo` → **Nueva correspondencia** → 2 destinatarios → guardar y copiar el **código de verificación** (se muestra una sola vez).
2. Entrar como `juridico@unior.edu.bo` → **Mi bandeja** → _Recibir_ → _Urgente_ → _Registrar salida_.
3. Volver como recepción o seguimiento → **Correspondencias** → detalle: historial, duración del tramo y demoras.
4. **Consulta pública** (sin sesión) → correlativo + código → estado público mínimo.
5. Como `seguimiento@unior.edu.bo` → **Demorados** → enviar alertas y revisar **Auditoría**.

---

## 6. Comandos

```bash
pnpm dev              # API + web en paralelo
pnpm dev:api          # solo API (nest start --watch)
pnpm dev:web          # solo web (next dev)
pnpm build            # build de API y web
pnpm test             # pruebas unitarias del backend (Jest)
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev
pnpm db:deploy        # prisma migrate deploy (producción)
pnpm db:seed          # datos de demostración
pnpm db:studio        # Prisma Studio
pnpm db:reset         # reinicia la base y vuelve a sembrar
node scripts/smoke.mjs  # prueba de humo end-to-end contra la API en ejecución
```

---

## 7. Pruebas

- **Unitarias (Jest, sin base de datos):** correlativo, transiciones del tramo, duración/demora, política de acceso por rol y ámbito, código público y estado público.

  ```bash
  pnpm test
  # 7 suites · 25 pruebas
  ```

- **Humo end-to-end (`scripts/smoke.mjs`):** 44 verificaciones contra la API real con la base sembrada: login, permisos cruzados, registro con correlativo, flujo completo del tramo, validaciones, consulta pública (código correcto/incorrecto/inexistente), anexos (carga, descarga, archivo no permitido), demoras, auditoría, archivo lógico y ciclo de refresh/logout.

  ```bash
  pnpm dev:api        # en otra terminal
  node scripts/smoke.mjs
  ```

- **Manual de aceptación:** registrar con 1, 2 y 3 destinatarios; verificar que un destinatario ajeno no accede; comprobar que las fechas las fija el servidor.

---

## 8. Seguridad y privacidad (resumen)

- Contraseñas con **bcrypt** (12 rondas); nunca se devuelve el hash.
- JWT de acceso corto + refresh opaco rotativo hasheado en base de datos; reutilización de un refresh revocado invalida toda la familia de sesiones.
- Guards globales de autenticación y rol; el acceso a cada recurso se valida contra creador/asignaciones (evita IDOR).
- Consulta pública: exige código de verificación (HMAC, comparación en tiempo constante), limita a 10 intentos/minuto por IP, devuelve un error genérico y solo campos públicos.
- Anexos: se valida el contenido real (firma PDF/JPG/PNG), tamaño máximo, nombre aleatorio en disco fuera del directorio público y descarga autenticada con `nosniff`.
- Validación estricta de DTO (`whitelist`, `forbidNonWhitelisted`), CORS restrictivo, `helmet`, límite global de peticiones y errores sin trazas internas.
- Auditoría de operaciones y de intentos de login/consulta pública, sin cuerpos de petición ni secretos.

---

## 9. Limitaciones conocidas y siguiente paso

- **Sesión en `localStorage`** (riesgo XSS aceptado en el MVP; en producción se recomienda cookie `httpOnly` + `SameSite`).
- **Límite de intentos en memoria** (por instancia): al escalar a varias instancias se requiere un almacén compartido.
- **Demoras calculadas en aplicación** tras leer los tramos abiertos: correcto para 5.000 registros/año; si el volumen crece conviene una vista/materialización en base de datos.
- **Almacenamiento local de anexos**: requiere volumen persistente y respaldo; la interfaz `StorageService` permite migrar a S3/MinIO.
- **Correo en el mismo proceso**: si SMTP falla, el envío queda `FALLIDO` y el flujo continúa; no hay reintento automático (solo registro).
- **Sin E2E de navegador** en esta entrega (la prueba de humo cubre la API y el build de tipos del frontend).
- **`prisma migrate dev` puede detectar drift** si se modificó el esquema manualmente: en ese caso usar `pnpm db:reset` (solo desarrollo).

Más detalle en [`docs/architecture.md`](docs/architecture.md), [`docs/api.md`](docs/api.md) y [`docs/decisions.md`](docs/decisions.md).
