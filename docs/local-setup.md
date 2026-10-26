# Levantar y probar el sistema en local (Windows)

Guía corta para dejar el sistema operativo en tu máquina y recorrer el flujo completo. Requisitos: Node 22+ (administrado con `fnm`), pnpm y PostgreSQL 16+ (Docker o instalación local).

## 0. Preparar la terminal

`node` debe estar en el PATH (si usas `fnm`, carga la versión antes de cualquier comando):

```powershell
fnm use 24          # o: fnm env --use-on-cd | Out-String | Invoke-Expression
node -v             # v22+ / v24.x
pnpm -v             # 11.x
```

Las dependencias ya están instaladas; si partes de otro clon: `pnpm install`.

## 1. Base de datos

### Opción A — Docker (recomendada)

```powershell
docker compose up -d postgres
docker compose ps          # esperar "healthy"
```

Usa el puerto **5433** para no chocar con una instalación local en 5432.

### Opción B — PostgreSQL local ya instalado

Si no tienes Docker corriendo, el repositorio incluye un clúster de desarrollo en `.pgdata` (ignorado por git) con el usuario `unior` y autenticación `trust`:

```powershell
$pg = 'C:\Program Files\PostgreSQL\18\bin'
& "$pg\pg_ctl.exe" -D 'D:\DESARROLLO\NESTJS\correspondencia-unior\.pgdata' -o "-p 5433" -l 'D:\DESARROLLO\NESTJS\correspondencia-unior\.pgdata\server.log' start
```

Para detenerlo: `& "$pg\pg_ctl.exe" -D '...\.pgdata' stop`.

> Si `pg_ctl` falla porque ya existe otro servidor, arranca directamente el proceso:
> `& "$pg\postgres.exe" -D '...\.pgdata' -p 5433` (queda en primer plano).

Comprueba la conexión:

```powershell
& "$pg\psql.exe" -h 127.0.0.1 -p 5433 -U unior -d correspondencia_unior -c "select count(*) from correspondences;"
```

La cadena de conexión ya está en `apps/api/.env` (`postgresql://unior:...@localhost:5433/correspondencia_unior`).

## 2. Esquema y datos de demostración

Solo la primera vez (o tras cambiar el esquema):

```powershell
pnpm db:generate     # cliente Prisma
pnpm db:migrate      # aplica prisma/migrations
pnpm db:seed         # usuarios y 5 correspondencias de ejemplo
```

Si ya sembraste y solo quieres datos limpios: `pnpm db:reset` (borra y vuelve a sembrar; **solo desarrollo**).

## 3. Levantar API y web

Dos terminales:

```powershell
pnpm dev:api         # http://localhost:3001/api/v1 · Swagger: /api/docs
pnpm dev:web         # http://localhost:3000
```

O ambos en una: `pnpm dev`.

Verificación rápida:

```powershell
curl.exe http://localhost:3001/api/v1/health            # 200 {"status":"ok","database":"up",...}
curl.exe http://localhost:3001/api/v1/tracking/stats    # 401: la API está viva y protegida
curl.exe http://localhost:3000/api/v1/health            # 200: proxy del frontend hacia la API
start http://localhost:3001/api/docs                    # Swagger
start http://localhost:3000                             # interfaz
```

En una terminal donde no tengas `curl`, `Invoke-WebRequest http://localhost:3001/api/v1/health` devuelve el mismo `200`.

> El frontend ya no llama a `http://localhost:3001` desde el navegador: usa `/api/v1/*` en su propio origen y Next lo reenvía a `API_INTERNAL_URL` (por defecto `http://localhost:3001/api/v1`). Por eso no hay CORS en desarrollo y el mismo código funciona en Dokploy.

## 4. Recorrido funcional (5 minutos)

1. **Login** en http://localhost:3000 con `recepcion@unior.edu.bo` / `Unior2026*`.
2. **Nueva correspondencia**: remitente, asunto, 1–3 destinatarios (por departamento o usuario). Al guardar, copia el **correlativo** y el **código de verificación** que aparecen una única vez.
3. **Mi bandeja** con `juridico@unior.edu.bo` / `Unior2026*`: _Recibir_ → _Urgente_ → _Registrar salida_. Las fechas y horas las pone el servidor.
4. **Detalle** (como recepción o seguimiento): hoja de ruta con duraciones, historial de eventos y anexos.
5. **Consulta pública** en http://localhost:3000/consulta (sin sesión): usa un correlativo demo con su código, por ejemplo `COR-2026-000002` + `B3MN-7RTY`. Un código incorrecto devuelve el mismo error genérico.
6. **Demorados** y **Auditoría** con `seguimiento@unior.edu.bo` / `Unior2026*`. El botón de alertas registra el envío como `OMITIDO` mientras no configures SMTP (no rompe nada).
7. **Usuarios** con `admin@unior.edu.bo` / `Unior2026*`.

Usuarios demo (contraseña común `Unior2026*`):

| Correo                   | Rol          |
| ------------------------ | ------------ |
| admin@unior.edu.bo       | ADMIN        |
| recepcion@unior.edu.bo   | RECEPCION    |
| seguimiento@unior.edu.bo | SEGUIMIENTO  |
| juridico@unior.edu.bo    | DESTINATARIO |
| academico@unior.edu.bo   | DESTINATARIO |
| rrhh@unior.edu.bo        | DESTINATARIO |

Correspondencias demo para consulta pública:

| Correlativo       | Código      |
| ----------------- | ----------- |
| `COR-2026-000001` | `A7K4-9QTX` |
| `COR-2026-000002` | `B3MN-7RTY` |
| `COR-2026-000003` | `C5PQ-2WXV` |
| `COR-2026-000004` | `D8HJ-4KLP` |
| `COR-2026-000005` | `E2RT-6NMB` |

(El año se toma de la zona institucional `America/La_Paz`; el seed imprime los correlativos exactos al terminar.)

## 5. Pruebas automatizadas

```powershell
pnpm test            # 25 pruebas unitarias (Jest, sin base de datos)
pnpm dev:api         # en otra terminal, para la prueba de humo
pnpm test:smoke      # 54 verificaciones contra la API real (crea registros)
```

La prueba de humo deja correspondencias y usuarios de prueba en la base: ejecuta `pnpm db:reset` después si quieres volver a los datos demo limpios.

Comprobaciones puntuales por API (útiles para depurar):

```powershell
$body = '{"email":"admin@unior.edu.bo","password":"Unior2026*"}'
$login = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/auth/login' -Method POST -Body $body -ContentType 'application/json'
$h = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/tracking/stats' -Headers $h
Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/correspondences?pageSize=3' -Headers $h
```

## 6. Problemas frecuentes

| Síntoma                                                 | Causa / solución                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `No es posible conectar con el servidor remoto` en 3001 | La API no está levantada o falló al arrancar; revisa la consola de `pnpm dev:api`.                                                            |
| `401` en todo el frontend                               | Token vencido o API caída: cierra sesión y vuelve a entrar.                                                                                   |
| `Can't reach database server`                           | PostgreSQL no está escuchando en 5433; revisa `docker compose ps` o el log `.pgdata/server.log`.                                              |
| `port 3000/3001 already in use`                         | Detén el proceso anterior: `Get-NetTCPConnection -LocalPort 3000,3001 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess }`. |
| `pnpm` no reconoce `node`                               | Carga fnm: `fnm use 24` (o `fnm env --use-on-cd \| Out-String \| Invoke-Expression`).                                                         |
| `prisma migrate dev` detecta drift                      | Usa `pnpm db:reset` en desarrollo (borra la base).                                                                                            |
| El código público se perdió                             | Un usuario `ADMIN`, `RECEPCION` o `SEGUIMIENTO` puede regenerarlo desde el detalle (el anterior queda revocado).                              |
| No llegan correos                                       | Sin `SMTP_HOST` los envíos quedan `OMITIDO`; configura SMTP en `.env` y revisa `GET /notifications` como ADMIN.                               |

## 7. Antes de una demo

```powershell
pnpm db:reset      # datos demo limpios
pnpm dev           # API + web
```

Y ten a mano: Swagger (`/api/docs`), un correlativo con su código, y dos sesiones (recepción y destinatario) para mostrar el tránsito de la hoja de ruta.
