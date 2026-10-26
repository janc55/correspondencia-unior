#!/usr/bin/env bash
# Arranque de la API en Dokploy/Nixpacks.
# 1) aplica migraciones versionadas, 2) bootstrap opcional del administrador,
# 3) arranca NestJS. Un fallo en migraciones detiene el arranque a propósito.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[api] Aplicando migraciones de Prisma..."
pnpm --filter @unior/api exec prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[api] RUN_SEED=true: cargando datos de demostración..."
  pnpm --filter @unior/api exec ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
fi

if [ "${BOOTSTRAP_ADMIN:-false}" = "true" ]; then
  echo "[api] BOOTSTRAP_ADMIN=true: verificando administrador inicial..."
  pnpm --filter @unior/api exec ts-node --compiler-options '{"module":"CommonJS"}' prisma/bootstrap-admin.ts
fi

echo "[api] Iniciando servidor NestJS en el puerto ${API_PORT:-3001}..."
exec node apps/api/dist/main.js
