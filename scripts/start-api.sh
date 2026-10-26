#!/usr/bin/env bash
# Arranque de la API en Dokploy/Nixpacks.
# 1) aplica migraciones versionadas, 2) bootstrap opcional del administrador,
# 3) arranca NestJS. Un fallo en migraciones detiene el arranque a propósito.
# Solo requiere Node en el runtime (no depende de pnpm ni del CLI de Nest).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[api] Aplicando migraciones de Prisma..."
  node node_modules/prisma/build/index.js migrate deploy
else
  echo "[api] RUN_MIGRATIONS=false: se omiten migraciones (usar pre-deploy)."
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[api] RUN_SEED=true: cargando datos de demostración..."
  node node_modules/ts-node/dist/bin.js \
    --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
fi

if [ "${BOOTSTRAP_ADMIN:-false}" = "true" ]; then
  echo "[api] BOOTSTRAP_ADMIN=true: verificando administrador inicial..."
  node node_modules/ts-node/dist/bin.js \
    --compiler-options '{"module":"CommonJS"}' prisma/bootstrap-admin.ts
fi

cd "$ROOT"
echo "[api] Iniciando servidor NestJS en el puerto ${API_PORT:-3001}..."
exec node apps/api/dist/main.js
