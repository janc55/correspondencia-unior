# Despliegue en Dokploy con Nixpacks

Guía para desplegar el sistema en un servidor con [Dokploy](https://dokploy.com) usando **Nixpacks** como tipo de build. Se despliegan tres servicios dentro del mismo proyecto de Dokploy:

| Servicio              | Tipo                          | Puerto         | Dominio sugerido                   |
| --------------------- | ----------------------------- | -------------- | ---------------------------------- |
| `correspondencia-db`  | PostgreSQL (Dokploy Database) | 5432 (interno) | sin exposición pública             |
| `correspondencia-api` | Application · Nixpacks        | 3001           | `api.midominio.edu.bo` (opcional)  |
| `correspondencia-web` | Application · Nixpacks        | 3000           | `correspondencia.midominio.edu.bo` |

El frontend **no llama directamente a la API desde el navegador**: usa un proxy same-origin (`/api/v1/*` → `API_INTERNAL_URL`) implementado en `apps/web/src/app/api/v1/[...path]/route.ts`. Por eso no hace falta configurar CORS ni variables `NEXT_PUBLIC_*` en el build, y la API puede quedar sin dominio público (solo accesible por la red interna de Dokploy) o con dominio solo para Swagger.

## 0. Antes de empezar

- Repositorio en GitHub/GitLab/Bitbucket con el proyecto (rama `main`).
- Servidor con Dokploy instalado y un dominio apuntando a él (`A`/`CNAME`).
- Secretos generados para producción (no reutilizar los de `.env.example`):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Genera tres valores distintos: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `PUBLIC_VERIFICATION_SECRET`.

## 1. Crear el proyecto y la base de datos

1. **Projects → Create Project**: nombre `correspondencia-unior`.
2. Dentro del proyecto, **Create Service → Database → PostgreSQL**:
   - Name: `correspondencia-db`
   - Database name: `correspondencia_unior`
   - User: `unior`
   - Password: contraseña larga y aleatoria.
3. Abre el servicio y copia la **Internal Connection URL**. Tendrá la forma:

   ```text
   postgresql://unior:<password>@correspondencia-db:5432/correspondencia_unior
   ```

   Añade `?schema=public&connection_limit=10` al final y guárdala para el paso siguiente. No expongas la base de datos a Internet ni la publiques con dominio.

> Si tu instancia usa un nombre de servicio distinto, copia la URL interna que muestra Dokploy: es la única fuente fiable del hostname.

## 2. Crear la aplicación de la API

1. Dentro del proyecto: **Create Service → Application**.
2. **General**:
   - Name: `correspondencia-api`
   - Provider: el de tu repositorio; selecciona repo y rama `main`.
   - Build Type: **Nixpacks**.
3. Pestaña **Environment** (variables del servicio):

```dotenv
# Build de Nixpacks
NIXPACKS_CONFIG_FILE=nixpacks.api.toml
NIXPACKS_NODE_VERSION=22

# Aplicación
NODE_ENV=production
API_PORT=3001
INSTITUTION_TIMEZONE=America/La_Paz
DATABASE_URL=postgresql://unior:<password>@correspondencia-db:5432/correspondencia_unior?schema=public
CORS_ORIGINS=https://correspondencia.midominio.edu.bo

# Seguridad (tres secretos distintos, >= 32 caracteres)
JWT_ACCESS_SECRET=<secreto-1>
JWT_REFRESH_SECRET=<secreto-2>
PUBLIC_VERIFICATION_SECRET=<secreto-3>
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=604800

# Reglas de negocio
OVERDUE_THRESHOLD_HOURS=24

# Archivos (debe coincidir con el volumen montado)
STORAGE_DIR=/app/data/storage
MAX_ATTACHMENT_MB=10

# Correo (opcional; si se deja vacío los envíos quedan OMITIDOS)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Correspondencia UNIOR <no-responder@midominio.edu.bo>"
MAIL_TRACKING_TEAM=seguimiento@midominio.edu.bo
OVERDUE_ALERTS_ENABLED=false

# Primer despliegue: crea el administrador y luego vuelve a false
BOOTSTRAP_ADMIN=true
ADMIN_EMAIL=admin@midominio.edu.bo
ADMIN_PASSWORD=<contraseña-fuerte-inicial>
ADMIN_NAME=Administrador UNIOR
ADMIN_DEPARTMENT_CODE=RECTORADO
ADMIN_DEPARTMENT_NAME=Rectorado
RUN_SEED=false
```

4. **Puerto / Domains**: asigna el dominio `api.midominio.edu.bo` con **Container Port `3001`** (o déjalo sin dominio si solo lo usará la web).
5. **Health Check**: path `/api/v1/health`, puerto `3001`, intervalo 15 s, timeout 5 s, start period 60 s (el primer arranque aplica migraciones).
6. **Mounts** (Advanced → Mounts): crea un volumen, por ejemplo `correspondencia-api-data`, con **Mount Path `/app/data`**. Sin este volumen los anexos se pierden en cada despliegue.
7. **Watch Paths** (Advanced): `apps/api/**`, `nixpacks.api.toml`, `scripts/start-api.sh`, `pnpm-lock.yaml`, `package.json`, `pnpm-workspace.yaml`.

La API arranca con `scripts/start-api.sh`:

1. `prisma migrate deploy` (idempotente; aplica solo migraciones nuevas),
2. bootstrap opcional del administrador (`BOOTSTRAP_ADMIN=true`),
3. `node apps/api/dist/main.js`.

## 3. Crear la aplicación web

1. **Create Service → Application** en el mismo proyecto.
2. **General**: Name `correspondencia-web`, mismo repositorio y rama, Build Type **Nixpacks**.
3. **Environment**:

```dotenv
NIXPACKS_CONFIG_FILE=nixpacks.web.toml
NIXPACKS_NODE_VERSION=22
NODE_ENV=production
PORT=3000
# URL de la API resuelta EN SERVIDOR (dominio público de la API o red interna)
API_INTERNAL_URL=https://api.midominio.edu.bo/api/v1
NEXT_PUBLIC_INSTITUTION_NAME="Universidad Privada de Oruro"
NEXT_PUBLIC_INSTITUTION_SHORT_NAME=UNIOR
```

> `API_INTERNAL_URL` debe terminar en `/api/v1`. Lo más seguro es usar el dominio público de la API (paso 2). Si prefieres tráfico interno, usa el hostname del contenedor que muestre Dokploy (por ejemplo `http://correspondencia-api:3001/api/v1`); si no resuelve, vuelve al dominio público: el proxy funciona igual, solo agrega un salto.
>
> **No definas `NEXT_PUBLIC_API_URL`**: si lo haces, el navegador llamará directamente a la API y necesitarás CORS. El valor por defecto (`/api/v1`, same-origin) es el recomendado.

4. **Domains**: `correspondencia.midominio.edu.bo` con **Container Port `3000`** y HTTPS (Let's Encrypt).
5. **Health Check**: path `/login`, puerto `3000`, intervalo 15 s, timeout 5 s, start period 30 s.
6. **Watch Paths**: `apps/web/**`, `nixpacks.web.toml`, `scripts/start-web.sh`, `pnpm-lock.yaml`, `package.json`, `pnpm-workspace.yaml`.

## 4. Primer despliegue

1. Despliega **primero la API** (`Deploy`). Revisa los logs: deben aparecer las migraciones aplicadas, el mensaje del bootstrap y `API escuchando...`.
2. Comprueba `https://api.midominio.edu.bo/api/v1/health` → `{"status":"ok","database":"up",...}`.
3. Despliega **la web** y abre `https://correspondencia.midominio.edu.bo/login`.
4. Inicia sesión con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
5. **Importante:** vuelve a la API → Environment → `BOOTSTRAP_ADMIN=false` (y borra `ADMIN_PASSWORD`), y redespliega. El script es idempotente (nunca reescribe contraseñas), pero no conviene dejar la contraseña inicial en las variables.
6. Crea los departamentos y usuarios reales desde **Usuarios** y las asignaciones por departamento.

### Alternativa sin bootstrap

Si prefieres crear el administrador manualmente, deja `BOOTSTRAP_ADMIN=false`, abre la **Terminal** del contenedor de la API y ejecuta:

```bash
pnpm --filter @unior/api prisma:bootstrap
```

(con `ADMIN_EMAIL`/`ADMIN_PASSWORD` definidos) o carga los datos demo solo en staging con `RUN_SEED=true` en un despliegue puntual.

## 5. Actualizaciones

- Cada `push` a `main` redespliega la app si activaste **Auto Deploy** (webhook de Dokploy).
- Las migraciones nuevas se aplican al arrancar la API. Si necesitas controlarlas por separado:
  - pon `RUN_MIGRATIONS=false` en la API y ejecuta `pnpm --filter @unior/api prisma:deploy` en un paso de pre-deploy o desde la terminal del contenedor.
- Para cambios de esquema destructivos, haz respaldo antes y evita desplegar API y web a la vez: API primero.

## 6. Respaldos y recuperación

- **Base de datos:** Dokploy permite programar respaldos del servicio Postgres (Advanced → Backups) hacia un destino S3 o local. Programa al menos un respaldo diario y prueba una restauración.
- **Anexos:** respalda el volumen `correspondencia-api-data` (Dokploy → Volume Backups) con la misma frecuencia.
- **Recuperación:** restaura la base, monta el volumen en la nueva instancia, despliega la misma versión (migraciones ya aplicadas) y verifica `/api/v1/health`, login y descarga de un anexo.

## 7. Verificación después del despliegue

```bash
# Salud y versión del esquema
curl -s https://api.midominio.edu.bo/api/v1/health

# Swagger (si publicaste el dominio de la API)
# https://api.midominio.edu.bo/api/docs

# Consulta pública a través del dominio web (sin sesión)
# https://correspondencia.midominio.edu.bo/consulta
```

Prueba funcional mínima en producción: login, registrar correspondencia con 2 destinatarios, recibir/clasificar/despachar con un destinatario, abrir el detalle y descargar el anexo, consultar el estado público con correlativo + código.

## 8. Problemas frecuentes

| Síntoma                                            | Causa probable                                                  | Solución                                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Build falla con `ERR_PNPM_OUTDATED_LOCKFILE`       | El lockfile no está commiteado o cambió `package.json`          | `pnpm install` local, commitear `pnpm-lock.yaml` y redesplegar.                                                     |
| `Cannot find module '/app/apps/api/dist/main.js'`  | El build no compiló la API                                      | Revisa `NIXPACKS_CONFIG_FILE=nixpacks.api.toml` y que el comando de build incluya `pnpm --filter @unior/api build`. |
| `PrismaClientInitializationError` / engine OpenSSL | Librerías del sistema                                           | Añade `NIXPACKS_DEBIAN=true` y/o `NIXPACKS_APT_PKGS=openssl,ca-certificates`.                                       |
| Health check `503`                                 | `DATABASE_URL` incorrecta, base no lista o migración fallida    | Revisa logs del arranque; prueba la URL interna desde el contenedor de la API.                                      |
| Web responde `502` al llamar a `/api/v1`           | `API_INTERNAL_URL` vacía o hostname interno incorrecto          | Usa el dominio público de la API; debe terminar en `/api/v1`.                                                       |
| `corepack`/pnpm falla al descargar en el build     | Corepack estricto o red restringida                             | Añade `COREPACK_ENABLE_STRICT=0` o fija `NIXPACKS_NODE_VERSION=22` y vuelve a desplegar.                            |
| Errores CORS en el navegador                       | Se definió `NEXT_PUBLIC_API_URL` y la API no permite ese origen | Elimina `NEXT_PUBLIC_API_URL` (vuelve al proxy) o ajusta `CORS_ORIGINS`.                                            |
| Anexos desaparecen tras redesplegar                | No hay volumen montado                                          | Monta el volumen en `/app/data` y define `STORAGE_DIR=/app/data/storage`.                                           |
| `next start` falla por puerto                      | `PORT` no coincide con el mapeado                               | Deja `PORT=3000` y configura el dominio con Container Port `3000`.                                                  |
| Build agota memoria                                | Build de Next en servidor pequeño                               | Sube la memoria del servidor/build, activa swap o usa un build server de Dokploy.                                   |
| Cambios de la API no se reflejan en la web         | Caché de build                                                  | Redespliega la web o usa `NIXPACKS_NO_CACHE=true` puntualmente.                                                     |

## 9. Notas de escalado

- Las migraciones corren al arrancar: con **una sola réplica** es suficiente. Si escalas la API a varias réplicas, pon `RUN_MIGRATIONS=false` y ejecuta `prisma migrate deploy` como pre-deploy único.
- El límite de intentos de la consulta pública es en memoria (por instancia). Con varias réplicas, el límite real se multiplica; para endurecerlo se necesita un almacén compartido.
- El almacenamiento de anexos es local al contenedor: no escales la API a réplicas sin almacenamiento compartido o S3/MinIO (la interfaz `StorageService` ya está preparada).
