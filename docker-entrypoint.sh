#!/usr/bin/env bash
set -euo pipefail

# Ждём готовности БД 
until pg_isready -h "${DB_HOST:-db}" -U "${POSTGRES_USER:-lingua_tutor}"; do
  echo "⏳ Waiting for Postgres at ${DB_HOST:-db}…"
  sleep 2
done

# Применяем миграции Prisma
echo "🚀 Running Prisma migrations…"
npx prisma migrate deploy

# Запускаем приложение
echo "✅ Starting app"
exec node build/src/main.js
