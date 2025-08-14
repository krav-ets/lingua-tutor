# Архитектура и технические заметки

Этот документ предназначен для быстрого погружения в кодовую базу и как справочник при разработке/рефакторинге. Удобно добавлять его в контекст LLM.

### Обзор системы
- **Назначение**: Телеграм‑бот для изучения слов по алгоритму интервальных повторений + веб‑API.
- **Стек**: Node.js 20 (ESM), TypeScript, grammy, Fastify, Prisma (PostgreSQL), Pino, Docker, Caddy.
- **Точка входа**: `src/main.ts`
  - Подключение к БД (`prisma.$connect()`).
  - Старт бота `createBot()` (polling или webhook).
  - Старт HTTP‑сервера `createServer()` (Fastify).

## Исполнение и модули

### Запуск бота
- Файл(ы): `src/main.ts`, `src/bot/index.ts`, `src/bot/context.ts`
- Режимы:
  - **Polling**: удаляем webhook (`bot.api.deleteWebhook()`), запускаем раннер `@grammyjs/runner` с `allowed_updates`.
  - **Webhook**: устанавливаем webhook (`bot.api.setWebhook`) с `secret_token`; Fastify обрабатывает `POST /webhook`.
- Контекст (`createContextConstructor`) добавляет в `Context`: `logger`, `config`, `prisma`.
- Подключённые middlewares/плагины:
  - `sequentialize` (только в polling), `autoChatAction`, `hydrate`, `session`, i18n, `setLocaleMiddleware`, conversations.
  - Ошибки через `errorBoundary(errorHandler)`.
- Основные модули бота:
  - Conversations: `study-words`, `repeat-words`, `greeting`.
  - Features: `welcome`, `settings`, `language`, `admin (setcommands)`, `study-words`, `repeat-words`, `add-word` (LLM‑перевод и предпросмотр).
  - Меню: `src/bot/menus/settings.ts`.

### HTTP‑сервер
- Файл(ы): `src/server/index.ts`
- Fastify с автозагрузкой:
  - Плагины: `src/server/plugins/*` (`sensible`, `cors`, `authenticate`).
  - Роуты: `src/server/routes/**` (autoload c `*routes.*`, `*hooks.*`).
- Префикс API: `/api` (задают опции автозагрузки).
- Ошибки: единый `setErrorHandler` (4xx → `info`, 5xx → `error`).
- Webhook: регистрируется `POST /webhook` при `config.isWebhookMode`.

## Конфигурация

- Файл(ы): `src/config.ts`
- Источник: ENV (поддержка `.env`, для тестов — `.env.test` при `TEST`).
- Валидация: `valibot` со схемой и трансформами.
- CamelCase из SNAKE_CASE (ENV ключи преобразуются функцией `convertKeysToCamelCase`).
- Ключевые поля:
  - `botMode` (`polling` | `webhook`) + зависимые `botWebhook`, `botWebhookSecret`.
  - `botToken`, `botAllowedUpdates` (JSON‑строка), `botAdmins` (JSON‑строка).
  - `serverHost`, `serverPort`, `jwtSecret`.
  - LLM: `llmApiKey`, `llmApiUrl`, `llmModel`.
  - Флаги: `isDebug`, `isWebhookMode`, `isPollingMode`.

## Данные и доменная логика

### Схема БД (Prisma) — `prisma/schema.prisma`
- `User`: `telegramId`, `uiLanguage`, `nativeLanguageCode`, `learningLanguageCode`, `wordsPerDay (default 7)`, связи с коллекциями/прогрессом.
- `Language`: `code`, `name`; связи с пользователями/коллекциями.
- `WordCollection`: `title`, `languageCode`, `translationLanguageCode`, `ownerId?`; слова и пользователи (selected).
  - `@@unique([title, languageCode, translationLanguageCode])`
- `Word`: `word`, `translation`, `transcription?`, `info Json`, `wordCollectionId`.
- `WordProgress`: уникально по `userId + wordId`; поля SM‑2: `repetitions`, `interval`, `easeFactor`, `quality?`, `status ("todo"|"inProgress"|"pause"|"done")`, `lastReviewedAt?`, `nextReviewAt?`, `startedAt?`.
- `Reminder`: напоминания.

### Сидинг
- Файл(ы): `prisma/seed.ts` — создаёт языки (`en`, `es`, `ru`) и примерные коллекции `en→ru`, `es→ru`.

### Репозитории — `src/repositories/*`
- `user.repository.ts`: `findById`, `findByTelegramId`, `updateByTelegramId`, `update`, `create`.
- `word-progress.repository.ts`:
  - `getTodayCount(userId)` по `startedAt` в пределах суток.
  - `findNextWordToStudy(userId)` → `status="todo"` c `include: word`.
  - `findWordToRepeat(userId)` → `status="inProgress"` и `nextReviewAt <= now`.
  - `updateStatus`, `countByUserAndStatus`, `findWordsToRepeat`, `findByUserAndWord`, `update`, `createMany`, `updateManyByUser`.
- `word-collection.repository.ts`: выборки по ID/владельцу/языкам.
- `word.repository.ts`: `findIdsByCollectionId`.

### Сервисы — `src/services/*`
- `word-study.service.ts`:
  - `getNextWordToStudy(userId)` — проверка дневного лимита (`wordsPerDay`), отдаёт следующий `todo` либо `null`.
  - `getNextWordToRepeat(userId)` — слово для повторения по `nextReviewAt <= now` и `status="inProgress"`.
  - `reviewWord({ userId, wordId, quality })` — расчёт SM‑2, `status="inProgress"`, обновление интервалов/дат.
- `user.service.ts`:
  - `addCollectionToUser(userId, collectionId)` — подключает коллекцию, создаёт/обновляет `WordProgress` со `status="todo"`.
  - `removeCollectionFromUser(userId, collectionId)` — отключает коллекцию, помечает соответствующие прогрессы `status="pause"`.

## Алгоритм SM‑2

- Файл(ы): `src/utils/sm-2.ts`
- Вход: `quality`, `repetitions`, `previousInterval`, `previousEaseFactor`.
- Правила:
  - `quality >= 3`:
    - `repetitions=0 → interval=1; 1 → interval=6; иначе → round(prevInterval * EF)`.
    - `repetitions++`, `EF += 0.1 - (5-quality)*(0.08 + (5-quality)*0.02)`.
  - `quality < 3`: `repetitions=0`, `interval=1`, `EF прежний`.
  - Минимум `EF = 1.3`.
- Возвращает `{ interval, repetitions, easeFactor }`.

## Бот: сценарии и интерфейс

### Диалоги — `src/bot/conversations/*`
- `study-words`:
  - Сообщение: перевод + `<tg-spoiler>` со словом и транскрипцией.
  - Клавиатура оценок 0–5 + кнопка завершения.
  - Обновление сообщения, вызов `reviewWord`.
  - При отсутствии новых слов — предложение перейти в повторение.
- `repeat-words`:
  - Сначала слово+транскрипция, по кнопке — перевод и клавиатура оценок.
  - Обновление сообщения, вызов `reviewWord`.
- `greeting`: учебный пример.

### Меню настроек — `src/bot/menus/settings.ts`
- Пункты: родной язык, изучаемый язык, язык UI, набор категорий (коллекции), количество слов в день.
- Динамические меню с инлайн‑обновлением.
- Действия над коллекциями используют `addCollectionToUser`/`removeCollectionFromUser`.

### I18n — `src/bot/i18n.ts`, `locales/*.ftl`
- Директория локалей: `locales`.
- По умолчанию `en`. `setLocaleMiddleware` берёт `user.uiLanguage` либо `ctx.from.language_code`.

### Логирование бота
- `src/bot/middlewares/update-logger.ts`: логирует апдейты, Bot API вызовы (через `ctx.api.config.use`) и время обработки.
- `src/bot/handlers/error.ts`: лог ошибок + полезное содержимое апдейта.

## Веб‑API и аутентификация

### Плагины — `src/server/plugins/*`
- `sensible` — HTTP утилиты и ошибки.
- `cors` — CORS.
- `authenticate` — `@fastify/jwt`; `server.authenticate` вызывает `request.jwtVerify()`; ошибки → `401`.

### Роуты — `src/server/routes/**`
- `/api`:
  - `GET /api` → `{ status: 'OK' }`.
  - `POST /api/auth`:
    - Тело: `{ initData: string }` — `initData` из Telegram WebApp.
    - Проверка: `verifyTelegramAuth(data, botToken)` (`src/utils/telegram-auth.ts`), HMAC SHA‑256 по `sha256(botToken)`.
    - Ответ: `{ token }` — JWT (`server.jwt.sign({ id: user.id })`).
- `/api/v1` (JWT):
  - `GET /api/v1` → `{ status: 'OK' }`.
  - `GET /api/v1/study/words/next` → заглушка `{ status: 'OK' }` (для расширения).

### Webhook
- При `config.isWebhookMode` обрабатывается `POST /webhook` (секрет `botWebhookSecret`).
- Caddy проксирует внешний трафик на `app:SERVER_PORT`.

## LLM‑интеграция

- Файл(ы): `src/llm/*`
- Клиент OpenAI: `src/llm/client.ts` — использует `llmApiKey`, `llmApiUrl`.
- Промпты: `src/llm/prompts/*.prompt.hbs` (разделитель `---` для `system`/`user`, кэширование).
- Вызовы:
  - `callLLMWithTool` — принудительный `tool_choice`, парсинг `tool.function.arguments` через `valibot`, схема генерится `@valibot/to-json-schema`.
  - `callLLMForText` — простой текст.
- Задачи:
  - `tasks/translate.ts`: `translate(word, direction, maxResults)` — возвращает список переводов.

## Логирование и события БД

- `src/logger.ts` — Pino:
  - `config.logLevel`, в debug — `pino-pretty`, в prod — `pino/file`.
- `src/prisma/index.ts`:
  - Подписки на `query|error|info|warn` → лог через pino.

## Сборка, пути и линт

- TypeScript (`tsconfig.json`):
  - ESM (`module: nodenext`), `target: ES2022`.
  - Алиас путей: `#root/*` → `./src/*`.
  - `noEmit: true` в tsconfig, но команда `build` переопределяет: `tsc --noEmit false` → `build`.
- Runtime‑импорт алиасов (`package.json`):
  - `"imports": { "#root/*": "./build/src/*" }` — ESM alias после сборки.
- ESLint (`eslint.config.js`):
  - База `@antfu/eslint-config`, требуются `;`, игнор миграций Prisma.

## Docker и инфраструктура

- Dockerfile:
  - Builder: `npm ci`, `prisma generate`, `npm run build`.
  - Runtime: `node:20-slim`, `postgresql-client`, копирование `build`, `node_modules`, `prisma`, `locales`.
  - Entrypoint: `docker-entrypoint.sh` → ожидание БД, `prisma migrate deploy`, запуск `node build/src/main.js`.
- `docker-compose.yml`:
  - `app`: билдинг образа, healthcheck `GET http://0.0.0.0:3000/api`, env из `.env`.
  - `db`: Postgres 15, volume `./data/db_data`.
  - `caddy`: TLS, прокси на `app:SERVER_PORT`; переменные `DOMAIN`, `EMAIL`, `LOG_FILE`, `SERVER_PORT`.
- `docker-compose.dev.yml`:
  - `db`, `test-db` (порты 5432/5433) для разработки/тестов.

## Тестирование

- Vitest (`vitest.config.ts`):
  - Плагины `vite-tsconfig-paths`, `environment: "node"`, `globals: true`, шаблоны путей тестов.
- Примеры:
  - `tests/server/server.test.ts`: `server.inject` тестирует `/api` и JWT‑защиту `/api/v1`.

## Инварианты и крайние случаи

- `WordProgress` уникален по `(userId, wordId)`.
- `reviewWord` всегда переводит статус в `inProgress` и обновляет `lastReviewedAt/nextReviewAt`.
- `getNextWordToStudy` → `null`, если `getTodayCount(userId) >= user.wordsPerDay`.
- `findWordToRepeat` учитывает только `nextReviewAt <= now` и `status="inProgress"`.
- Минимальный `easeFactor`: `1.3`.
- JWT обязателен для `/api/v1/**`.
- В webhook‑режиме убедиться в корректности `botWebhookSecret` и внешней доступности `/webhook`.

## Полезные команды

- npm: `dev`, `start`, `start:force`, `build`, `lint`, `format`, `typecheck`, `test`.
- Makefile:
  - БД: `up-db`, `down-db`, `logs-db`, `clean-db`.
  - Prisma: `migrate-deploy`, `migrate-dev name=<name>`, `migrate-reset`, `migrate-status`, `seed`, `studio`.

## Точки расширения и TODO

- Реализовать REST‑эндпоинты под изучение/повтор (сейчас заглушки в `v1/study/words`).
- Импорт выбранного перевода из LLM в БД в `add-word`.
- Интегрировать напоминания `Reminder`.
- Поддержка групп/каналов при необходимости.

## Типы и декларации

- `src/types/fastify.d.ts`:
  - `FastifyInstance`: `config`, `authenticate`, `jwt`.
  - `FastifyRequest.user: { id: number }`.
