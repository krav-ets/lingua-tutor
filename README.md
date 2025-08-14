# lingua-tutor

Телеграм-бот для изучения иностранных слов с интервальными повторениями (SM-2) и веб-API на Fastify.

### Возможности
- **Интервальные повторения (SM‑2)**: изучение и повторение слов на основе качества ответа.
- **Диалоги бота**: изучение новых слов и повторение ранее изученных.
- **i18n**: поддержка нескольких языков интерфейса (`locales/en.ftl`, `locales/ru.ftl`).
- **Веб‑сервер**: REST API (JWT), режимы бота polling/webhook.
- **Prisma + PostgreSQL**: миграции, сидинг коллекций слов.

### Технологии
- Node.js 20, TypeScript, ESM
- grammy (+ conversations, hydrate, menu, i18n)
- Fastify (+ autoload, jwt, sensible, cors)
- Prisma ORM (PostgreSQL)
- Pino logger
- Docker, docker-compose, Caddy

## Быстрый старт (локально)

### Требования
- Node.js >= 20
- PostgreSQL 15+ (или `docker-compose.dev.yml`)
- npm

### Установка
```bash
npm ci
npx prisma generate
```

### База данных (локально через Docker)
```bash
# поднять Postgres для разработки
make up-db
# применить миграции
make migrate-deploy
# (опционально) засидить коллекции слов
make seed
```

### Переменные окружения (.env)
Создайте `.env` в корне (пример ниже). В локалке БД обычно на 5432, при использовании `docker-compose.dev.yml` — тоже 5432.

```env
# БД
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lingua_tutor?schema=public

# Общие
DEBUG="true"
LOG_LEVEL=info
JWT_SECRET=replace_with_strong_secret

# Бот
BOT_TOKEN=123456789:ABC...   # обязателен для режимов бота
BOT_MODE=polling             # polling | webhook
BOT_ALLOWED_UPDATES='["message","callback_query"]'
BOT_ADMINS='[123456789]'     # список id админов (опц.)

# Сервер
SERVER_HOST=0.0.0.0
SERVER_PORT=3000

# Webhook режим (если BOT_MODE=webhook)
BOT_WEBHOOK=https://your-domain.com/webhook
BOT_WEBHOOK_SECRET=your_webhook_secret_min_12_chars

# LLM (опционально)
LLM_API_KEY=
LLM_API_URL=
LLM_MODEL=
```

Примечания к конфигу:
- Все переменные читаются и валидируются в `src/config.ts`.
- Флаги `DEBUG`, `BOT_ALLOWED_UPDATES`, `BOT_ADMINS` парсятся как JSON‑строки.

### Запуск в разработке
```bash
npm run dev
```
Бот запустится в режиме polling (если `BOT_MODE=polling`) и поднимется HTTP‑сервер Fastify.

### Тесты
```bash
npm test
```

## Запуск в Docker (production)

### Подготовка
- Создайте `.env` с прод‑настройками (включая `DATABASE_URL`, `JWT_SECRET`, `BOT_*`, `DOMAIN`, `EMAIL`, `SERVER_PORT`, и т.д.)
- Укажите `IMAGE_ADDRESS` и (опц.) `IMAGE_TAG` в окружении для сервиса `app`.

### Запуск
```bash
docker compose up -d --build
```

Сервисы:
- `db`: PostgreSQL 15
- `app`: Node.js приложение (миграции применяются в `docker-entrypoint.sh`)
- `caddy`: HTTPS reverse proxy (берёт `DOMAIN`, `EMAIL`, `LOG_FILE`, `SERVER_PORT` из окружения). Проксирует на `app:SERVER_PORT`.

Caddyfile использует:
```
DOMAIN, EMAIL, LOG_FILE, SERVER_PORT
```

## Архитектура

### Обзор
- `src/main.ts`: точка входа; подключение к БД, запуск бота и сервера.
- `src/config.ts`: сбор и валидация env → `Config` (режимы бота, токены, логирование, сервер).
- `src/bot/**`: логика телеграм‑бота (middlewares, features, menus, conversations).
- `src/server/**`: Fastify‑сервер, плагины (`jwt`, `cors`, `sensible`), автозагрузка роутов.
- `src/repositories/**`: слой доступа к данным (Prisma).
- `src/services/**`: доменная логика (напр. SM‑2 расчёты).
- `src/utils/**`: вспомогательные утилиты (SM‑2, Telegram auth).
- `prisma/**`: `schema.prisma`, миграции, сиды.

## Локализация

- Файлы локалей: `locales/en.ftl`, `locales/ru.ftl`
- i18n настраивается в `src/bot/i18n.ts` и используется в клавиатурах/диалогах.
