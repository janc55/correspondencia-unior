# Decisiones técnicas y limitaciones

Registro de decisiones (ADR resumidas) y de lo que queda conscientemente fuera del MVP.

## Decisiones

### D1 · Monolito modular NestJS

**Contexto:** 300–400 correspondencias/mes, 20–25 usuarios, equipo pequeño.
**Decisión:** un solo despliegue con módulos de dominio bien separados.
**Consecuencia:** operación simple; los módulos pueden extraerse si aparece necesidad real de escalado independiente.

### D2 · PostgreSQL + Prisma

**Contexto:** relaciones fuertes (correspondencia → hoja de ruta → tramos), transacciones y migraciones.
**Decisión:** PostgreSQL 16 con Prisma 6 y migraciones versionadas en `apps/api/prisma/migrations`.
**Consecuencia:** esquema reproducible; `prisma migrate deploy` en producción.

### D3 · Correlativo generado en base de datos

**Contexto:** el correlativo debe ser único, sin huecos por carreras y no confiar en el cliente.
**Decisión:** tabla `correlative_sequences` por año, incrementada con `INSERT … ON CONFLICT … RETURNING` dentro de la misma transacción que crea la correspondencia.
**Consecuencia:** unicidad y orden garantizados; el formato vive en `correlative.ts` y está probado.

### D4 · Eventos históricos inmutables + estado actual derivado

**Contexto:** auditoría y cálculo de tiempos por tramo.
**Decisión:** cada transición agrega un `TrackingEvent`; el estado del tramo y de la correspondencia se actualiza con `updateMany` condicionado por el estado esperado.
**Consecuencia:** el historial no se pierde y las transiciones concurrentes no se duplican.

### D5 · Fechas oficiales en el servidor (UTC)

**Contexto:** evitar que el cliente fije fechas.
**Decisión:** `registeredAt`, `receivedAt`, `classifiedAt` y `dispatchedAt` se generan en el backend; la zona `America/La_Paz` se usa solo para presentación y para el corte del día en métricas.
**Consecuencia:** consistencia entre reportes y auditoría.

### D6 · Consulta externa con código de verificación HMAC

**Contexto:** el correlativo es enumerable y no debe revelar información.
**Decisión:** al registrar se genera un código `XXXX-XXXX` (alfabeto sin caracteres ambiguos); solo se guarda su HMAC-SHA256 con un secreto del servidor. La consulta exige correlativo + código, limita intentos y responde un error genérico.
**Consecuencia:** el código se muestra una única vez; si se pierde, un rol autorizado puede rotarlo.

### D7 · Autorización como política pura + filtro Prisma

**Contexto:** evitar IDOR y divergencias entre detalle y listados.
**Decisión:** `canAccessCorrespondence`/`canActOnRecipient` deciden sobre objetos ya cargados y `correspondenceScopeFilter` genera el filtro equivalente para listados.
**Consecuencia:** una sola definición de ámbito, cubierta por pruebas unitarias.

### D8 · Almacenamiento de archivos abstraído

**Contexto:** simplicidad del MVP sin cerrar la puerta a S3/MinIO.
**Decisión:** `StorageService` con implementación local fuera del directorio público; claves aleatorias; validación de firma binaria y descarga autenticada.
**Consecuencia:** migrar a objetos implica una nueva implementación del servicio.

### D9 · Notificaciones en el proceso, sin cola

**Contexto:** bajo volumen de correo; no bloquear el flujo principal.
**Decisión:** envío SMTP con nodemailer, registro en `NotificationLog` y ejecución en segundo plano tolerante a fallos; si no hay SMTP, queda `OMITIDO`.
**Consecuencia:** no hay reintentos automáticos; el histórico permite reintento administrativo manual.

### D10 · Sesión en `localStorage`

**Contexto:** MVP sin backend de sesión para el frontend.
**Decisión:** access token (1 h) + refresh rotativo en `localStorage`, con refresh automático y logout que revoca.
**Consecuencia:** riesgo XSS aceptado y documentado; en producción se recomienda cookie `httpOnly` + `SameSite` emitida por la API. Cualquier cambio futuro debe centralizarse en `apps/web/src/lib/api.ts`.

### D11 · Sin paquete `shared` todavía

**Contexto:** el SDD aconseja no abstraer paquetes compartidos sin necesidad concreta.
**Decisión:** contrato en `docs/api-contract.md` y tipos del cliente en `apps/web/src/lib/types.ts`.
**Consecuencia:** menos fricción de build; si el contrato crece, extraer `packages/shared`.

### D12 · Skills de skills.sh no instaladas

**Contexto:** el SDD recomienda evaluar tres skills, revisando su contenido y permisos antes de confiar en ellas.
**Decisión:** no se instalaron en esta entrega; el trabajo se realizó con las guías del repositorio. Antes de incorporarlas, revisar `SKILL.md`, repositorio de origen y comandos propuestos, y no compartir secretos.

## Limitaciones conocidas

1. **Throttling en memoria**: por instancia; con varias réplicas se necesita un almacén compartido.
2. **Cálculo de demoras en aplicación**: se leen los tramos abiertos y se calcula en memoria. Adecuado para el volumen previsto; si crece, conviene una vista materializada.
3. **Almacenamiento local de anexos**: requiere volumen persistente y respaldo; no hay antivirus ni análisis profundo de contenido.
4. **Sin reintento automático de correos** ni plantillas editables por la institución.
5. **Sin E2E de navegador**: se cubre con pruebas unitarias, prueba de humo de API y build/typecheck del frontend.
6. **Sin recuperación de contraseña por correo** (solo un ADMIN puede restablecerla).
7. **Sin firma digital certificada ni integración con sistemas universitarios** (fuera del MVP).
8. **Auditoría de lectura**: se registran operaciones que modifican datos y los intentos de login/consulta pública; la lectura de detalles no se audita para no inflar el volumen.
9. **Restablecer la contraseña revoca todas las sesiones** del usuario; no hay notificación al respecto.
10. **El código público no se puede recuperar**: solo rotar. Es una decisión de seguridad, no un defecto.

## Checklist antes de producción

- [ ] Secretos aleatorios y distintos para `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `PUBLIC_VERIFICATION_SECRET` (≥ 32 caracteres).
- [ ] HTTPS extremo a extremo y `CORS_ORIGINS` con el dominio real.
- [ ] `NODE_ENV=production`, `SMTP_*` institucional y `MAIL_TRACKING_TEAM` configurado.
- [ ] `STORAGE_DIR` en volumen persistente con respaldo.
- [ ] Respaldos cifrados de PostgreSQL y prueba de restauración documentada.
- [ ] Migraciones aplicadas con `prisma migrate deploy` y datos demo eliminados.
- [ ] Validar con UNIOR reglas de retención, privacidad y quién puede ver remitentes, asuntos y anexos.
- [ ] Revisar política de contraseñas y, si corresponde, integrar directorio institucional.
