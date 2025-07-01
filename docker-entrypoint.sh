#!/usr/bin/env bash
set -euo pipefail

# Ждём готовности БД (переменные из .env: DB_HOST, DB_USER)
until pg_isready -h "${DB_HOST:-db}" -U "${DB_USER:-lingua_tutor}"; do
  echo "⏳ Waiting for Postgres at ${DB_HOST:-db}…"
  sleep 2
done

# Применяем миграции Prisma
echo "🚀 Running Prisma migrations…"
npx prisma migrate deploy

# Запускаем приложение
echo "✅ Starting app"
exec node dist/main.js
