#!/usr/bin/env bash
# Arranque del frontend Next.js en Dokploy/Nixpacks.
# Next escucha en 0.0.0.0 y en el puerto indicado por PORT (3000 por defecto).
set -euo pipefail

cd "$(dirname "$0")/.."

export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export NODE_ENV="${NODE_ENV:-production}"

echo "[web] Iniciando Next.js en ${HOSTNAME}:${PORT}..."
exec pnpm --filter @unior/web start
