# Architecture and Technical Notes

This document is a quick reference to the codebase intended for development/refactoring. It’s convenient to include it in an LLM context.

### System overview
- Purpose: Telegram bot for vocabulary learning using SM‑2 + a web API.
- Stack: Node.js 20 (ESM), TypeScript, grammy, Fastify, Prisma (PostgreSQL), Pino, Docker, Caddy.
- Entry point: `src/main.ts`
  - Connects to DB (`prisma.$connect()`).
  - Starts the bot via `createBot()` (polling or webhook).
  - Starts the HTTP server via `createServer()` (Fastify).

## Runtime and modules

### Bot startup
- Files: `src/main.ts`, `src/bot/index.ts`, `src/bot/context.ts`
- Modes:
  - Polling: delete webhook (`bot.api.deleteWebhook()`), start `@grammyjs/runner` with `allowed_updates`.
  - Webhook: set webhook (`bot.api.setWebhook`) with `secret_token`; Fastify handles `POST /webhook`.
- Context (`createContextConstructor`) injects `logger`, `config`, `prisma` into `Context`.
- Middlewares/plugins:
  - `sequentialize` (polling only), `autoChatAction`, `hydrate`, `session`, i18n, `setLocaleMiddleware`, conversations.
  - Errors via `errorBoundary(errorHandler)`.
- Main bot modules:
  - Conversations: `study-words`, `repeat-words`, `greeting`.
  - Features: `welcome`, `settings`, `language`, `admin (setcommands)`, `study-words`, `repeat-words`, `add-word` (LLM translation with preview).
  - Menu: `src/bot/menus/settings.ts`.

### HTTP server
- Files: `src/server/index.ts`
- Fastify with autoload:
  - Plugins: `src/server/plugins/*` (`sensible`, `cors`, `authenticate`).
  - Routes: `src/server/routes/**` (autoload with `*routes.*`, `*hooks.*`).
- API prefix: `/api` (set by autoload options).
- Errors: unified `setErrorHandler` (4xx → `info`, 5xx → `error`).
- Webhook: registers `POST /webhook` when `config.isWebhookMode`.

## Configuration

- Files: `src/config.ts`
- Source: ENV (supports `.env`, `.env.test` when `TEST`).
- Validation: `valibot` with transforms.
- SNAKE_CASE to camelCase conversion for ENV keys.
- Key fields:
  - `botMode` (`polling` | `webhook`) + dependent `botWebhook`, `botWebhookSecret`.
  - `botToken`, `botAllowedUpdates` (JSON string), `botAdmins` (JSON string).
  - `serverHost`, `serverPort`, `jwtSecret`.
  - LLM: `llmApiKey`, `llmApiUrl`, `llmModel`.
  - Flags: `isDebug`, `isWebhookMode`, `isPollingMode`.

## Data and domain logic

### DB schema (Prisma) — `prisma/schema.prisma`
- `User`: `telegramId`, `uiLanguage`, `nativeLanguageCode`, `learningLanguageCode`, `wordsPerDay (default 7)`, relations to collections/progress.
- `Language`: `code`, `name`; relations to users/collections.
- `WordCollection`: `title`, `languageCode`, `translationLanguageCode`, `ownerId?`; words and selected users.
  - `@@unique([title, languageCode, translationLanguageCode])`
- `Word`: `word`, `translation`, `transcription?`, `info Json`, `wordCollectionId`.
- `WordProgress`: unique by `userId + wordId`; SM‑2 fields: `repetitions`, `interval`, `easeFactor`, `quality?`, `status ("todo"|"inProgress"|"pause"|"done")`, `lastReviewedAt?`, `nextReviewAt?`, `startedAt?`.
- `Reminder`: reminders.

### Seeding
- Files: `prisma/seed.ts` — seeds languages (`en`, `es`, `ru`) and sample `en→ru`, `es→ru` word collections.

### Repositories — `src/repositories/*`
- `user.repository.ts`: `findById`, `findByTelegramId`, `updateByTelegramId`, `update`, `create`.
- `word-progress.repository.ts`:
  - `getTodayCount(userId)`: by `startedAt` within the day.
  - `findNextWordToStudy(userId)`: `status="todo"` with `include: word`.
  - `findWordToRepeat(userId)`: `status="inProgress"` and `nextReviewAt <= now`.
  - `updateStatus`, `countByUserAndStatus`, `findWordsToRepeat`, `findByUserAndWord`, `update`, `createMany`, `updateManyByUser`.
- `word-collection.repository.ts`: queries by id/owner/languages.
- `word.repository.ts`: `findIdsByCollectionId`.

### Services — `src/services/*`
- `word-study.service.ts`:
  - `getNextWordToStudy(userId)` — checks daily limit (`wordsPerDay`), returns next `todo` or `null`.
  - `getNextWordToRepeat(userId)` — word to repeat by `nextReviewAt <= now` and `status="inProgress"`.
  - `reviewWord({ userId, wordId, quality })` — SM‑2 calc, `status="inProgress"`, updates intervals and dates.
- `user.service.ts`:
  - `addCollectionToUser(userId, collectionId)` — connect collection, create/update `WordProgress` to `status="todo"`.
  - `removeCollectionFromUser(userId, collectionId)` — disconnect collection, set related progresses to `status="pause"`.

## SM‑2 algorithm

- Files: `src/utils/sm-2.ts`
- Input: `quality`, `repetitions`, `previousInterval`, `previousEaseFactor`.
- Rules:
  - `quality >= 3`:
    - `repetitions=0 → interval=1; 1 → interval=6; else → round(prevInterval * EF)`.
    - `repetitions++`, `EF += 0.1 - (5-quality)*(0.08 + (5-quality)*0.02)`.
  - `quality < 3`: `repetitions=0`, `interval=1`, `EF unchanged`.
  - Minimum `EF = 1.3`.
- Returns `{ interval, repetitions, easeFactor }`.

## Bot: flows and UI

### Conversations — `src/bot/conversations/*`
- `study-words`:
  - Message: translation + `<tg-spoiler>` with the word and transcription.
  - Rating keyboard 0–5 + finish button.
  - Edits the message, calls `reviewWord`.
  - If no new words — suggests switching to repetition.
- `repeat-words`:
  - Initially shows word+transcription; on “show answer” reveals translation and rating keyboard.
  - Edits the message, calls `reviewWord`.
- `greeting`: simple example.

### Settings menu — `src/bot/menus/settings.ts`
- Items: native language, learning language, UI language, categories (collections), daily word count.
- Dynamic inline menus.
- Uses `addCollectionToUser`/`removeCollectionFromUser` actions.

### I18n — `src/bot/i18n.ts`, `locales/*.ftl`
- Locales directory: `locales`.
- Default `en`. `setLocaleMiddleware` uses `user.uiLanguage` or `ctx.from.language_code`.

### Bot logging
- `src/bot/middlewares/update-logger.ts`: logs updates, Bot API calls (via `ctx.api.config.use`) and processing time.
- `src/bot/handlers/error.ts`: logs errors + update details.

## Web API and authentication

### Plugins — `src/server/plugins/*`
- `sensible` — HTTP utilities and errors.
- `cors` — CORS.
- `authenticate` — `@fastify/jwt`; `server.authenticate` calls `request.jwtVerify()`; errors → `401`.

### Routes — `src/server/routes/**`
- `/api`:
  - `GET /api` → `{ status: 'OK' }`.
  - `POST /api/auth`:
    - Body: `{ initData: string }` — Telegram WebApp `initData`.
    - Check: `verifyTelegramAuth(data, botToken)` (`src/utils/telegram-auth.ts`), HMAC SHA‑256 with `sha256(botToken)`.
    - Response: `{ token }` — JWT (`server.jwt.sign({ id: user.id })`).
- `/api/v1` (JWT):
  - `GET /api/v1` → `{ status: 'OK' }`.
  - `GET /api/v1/study/words/next` → stub `{ status: 'OK' }` (to extend).

### Webhook
- When `config.isWebhookMode`, server handles `POST /webhook` (secret `botWebhookSecret`).
- Caddy reverse proxies external traffic to `app:SERVER_PORT`.

## LLM integration

- Files: `src/llm/*`
- OpenAI client: `src/llm/client.ts` — uses `llmApiKey`, `llmApiUrl`.
- Prompts: `src/llm/prompts/*.prompt.hbs` (system/user separated by `---`, cached).
- Calls:
  - `callLLMWithTool` — forced `tool_choice`, parse `tool.function.arguments` with `valibot`, schema via `@valibot/to-json-schema`.
  - `callLLMForText` — plain text.
- Tasks:
  - `tasks/translate.ts`: `translate(word, direction, maxResults)` — returns translations array.

## Logging and DB events

- `src/logger.ts` — Pino:
  - Level from `config.logLevel`, `pino-pretty` in debug, `pino/file` in prod.
- `src/prisma/index.ts`:
  - Subscribes to `query|error|info|warn` → logs via pino.

## Build, paths, lint

- TypeScript (`tsconfig.json`):
  - ESM (`module: nodenext`), `target: ES2022`.
  - Path alias: `#root/*` → `./src/*`.
  - `noEmit: true` in tsconfig, but `npm run build` uses `tsc --noEmit false` → outputs to `build`.
- Runtime import aliases (`package.json`):
  - `"imports": { "#root/*": "./build/src/*" }` — ESM alias after build.
- ESLint (`eslint.config.js`):
  - Based on `@antfu/eslint-config`, requires semicolons, ignores Prisma migrations.

## Docker and infrastructure

- Dockerfile:
  - Builder: `npm ci`, `prisma generate`, `npm run build`.
  - Runtime: `node:20-slim`, `postgresql-client`, copies `build`, `node_modules`, `prisma`, `locales`.
  - Entrypoint: `docker-entrypoint.sh` → wait for DB, `prisma migrate deploy`, start `node build/src/main.js`.
- `docker-compose.yml`:
  - `app`: builds image, healthcheck `GET http://0.0.0.0:3000/api`, env from `.env`.
  - `db`: Postgres 15, volume `./data/db_data`.
  - `caddy`: TLS, reverse proxy to `app:SERVER_PORT`; env `DOMAIN`, `EMAIL`, `LOG_FILE`, `SERVER_PORT`.
- `docker-compose.dev.yml`:
  - `db`, `test-db` (ports 5432/5433) for dev/tests.

## Testing

- Vitest (`vitest.config.ts`):
  - `vite-tsconfig-paths` for aliases, `environment: "node"`, `globals: true`, test globs.
- Examples:
  - `tests/server/server.test.ts`: uses `server.inject` to test `/api` and JWT protection of `/api/v1`.

## Invariants and edge cases

- `WordProgress` unique on `(userId, wordId)`.
- `reviewWord` always moves to `inProgress` and updates `lastReviewedAt/nextReviewAt`.
- `getNextWordToStudy` → `null` when `getTodayCount(userId) >= user.wordsPerDay`.
- `findWordToRepeat` filters `nextReviewAt <= now` and `status="inProgress"`.
- Minimum `easeFactor`: `1.3`.
- JWT required for `/api/v1/**`.
- In webhook mode, ensure correct `botWebhookSecret` and external reachability of `/webhook`.

## Useful commands

- npm: `dev`, `start`, `start:force`, `build`, `lint`, `format`, `typecheck`, `test`.
- Makefile:
  - DB: `up-db`, `down-db`, `logs-db`, `clean-db`.
  - Prisma: `migrate-deploy`, `migrate-dev name=<name>`, `migrate-reset`, `migrate-status`, `seed`, `studio`.

## Extension points and TODO

- Implement REST endpoints for study/repeat (currently stubs in `v1/study/words`).
- Persist chosen LLM translation to DB in `add-word`.
- Integrate `Reminder`.
- Consider groups/channels support if needed.

## Types and declarations

- `src/types/fastify.d.ts`:
  - `FastifyInstance`: `config`, `authenticate`, `jwt`.
  - `FastifyRequest.user: { id: number }`.
