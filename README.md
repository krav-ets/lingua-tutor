# Lingua Tutor

Lingua Tutor is a Telegram bot designed to help users learn new words effectively. Its main purpose is to facilitate vocabulary acquisition through interactive features and spaced repetition.

Core technologies used:
* Node.js
* TypeScript
* grammY (for Telegram bot interaction)
* Prisma (ORM for database management)
* PostgreSQL (database)
* Fastify (for potential API capabilities)

## Features

- **Word Management:** Add new words to your learning list (manually, with potential for LLM-powered suggestions).
- **Study Mode:** Actively study words using interactive prompts.
- **Spaced Repetition:** Review words at optimal intervals to enhance retention (leveraging the SM-2 algorithm).
- **Repetition Mode:** Specifically revisit words marked for repetition.
- **Language Selection:** Change the interface language of the bot.
- **User Settings:** Access and manage your preferences.
- **Welcome & Onboarding:** A friendly greeting and initial setup for new users.
- **Admin Panel:** Special commands and features for bot administrators.
- **Unhandled Message Handling:** Graceful responses for unrecognized commands or messages.

## Getting Started

### Prerequisites

- **Node.js:** Version >=20.0.0 (as specified in `package.json`)
- **npm:** Version >=8.0.0 (as specified in `package.json`) or Yarn
- **Docker and Docker Compose:** For setting up and managing the PostgreSQL database.

### Environment Variables

The project uses a `.env` file to manage environment variables. You can copy the `.env.test` file (if available, or create a new `.env` file) and populate it with your specific configuration.

Key environment variables:

- `BOT_TOKEN`: Your Telegram bot token. Get this from BotFather on Telegram.
- `DATABASE_URL`: Connection string for the PostgreSQL database. Example: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- `JWT_SECRET`: A strong, secret key for JWT (JSON Web Token) authentication.
- `LLM_API_KEY`: (Optional) API key for an LLM service (e.g., OpenAI) if you want to use LLM-powered features.
- `LLM_API_URL`: (Optional) URL for the LLM API.
- `LLM_MODEL`: (Optional) Model name for the LLM (e.g., `gpt-3.5-turbo`).
- `BOT_MODE`: Specifies how the bot receives updates. Can be `polling` or `webhook`.
- `BOT_WEBHOOK`: (Required if `BOT_MODE` is 'webhook') The publicly accessible URL for your bot's webhook.
- `BOT_WEBHOOK_SECRET`: (Required if `BOT_MODE` is 'webhook') A secret token passed with each update to verify the requestor.
- `BOT_ADMINS`: (Optional) A JSON array of Telegram user IDs for bot administrators. Example: `[123456789, 987654321]`
- `SERVER_HOST`: (Optional) Host for the Fastify server (if API capabilities are used). Defaults to `0.0.0.0`.
- `SERVER_PORT`: (Optional) Port for the Fastify server. Defaults to `80`.
- `LOG_LEVEL`: (Optional) The logging level for the application (e.g., 'info', 'debug', 'warn', 'error'). Defaults to 'info'.
- `DEBUG`: (Optional) Set to 'true' to enable debug mode, which might provide more verbose logging or other debugging features. Defaults to 'false'.

### Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/lingua-tutor.git # Replace with the actual repository URL
    cd lingua-tutor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    (Alternatively, if you use Yarn: `yarn install`)

3.  **Set up the database:**
    *   Start the PostgreSQL database using Docker Compose. This command uses the service `db` defined in your `docker-compose.yml` file:
        ```bash
        docker-compose up -d db
        ```
    *   Ensure Docker is running before executing this command.

4.  **Run database migrations:**
    *   Apply schema changes to your database. This command executes the migration files found in `prisma/migrations` against the database specified in your `DATABASE_URL` and updates the schema based on `prisma/schema.prisma`.
        ```bash
        npx prisma migrate dev
        ```

5.  **(Optional) Seed the database:**
    *   If you want to populate your database with initial data (as defined in `prisma/seed.ts`), run:
        ```bash
        npx prisma db seed
        ```
    *   The `package.json` file should have a `prisma.seed` script configured for this command to work (e.g., `"prisma": { "seed": "tsx prisma/seed.ts" }`).

6.  **Configure environment variables:**
    *   Create a `.env` file. You can copy the `.env.test` file if it exists and serves as a template, or create the `.env` file from scratch.
        ```bash
        cp .env.test .env  # If .env.test exists and is suitable
        # Otherwise, create .env manually
        ```
    *   Fill in the necessary values in your `.env` file, referring to the "Environment Variables" section above for details on each variable. Make sure `DATABASE_URL` in your `.env` file matches the credentials and settings used by your Docker Compose database setup (e.g., username, password, port, database name).

## Running the Bot

Make sure you have completed the "Installation and Setup" steps, especially configuring your `.env` file, before running the bot.

### Development Mode

This mode is ideal for development as it typically includes features like hot-reloading, which automatically restarts the bot when you make changes to the code.

To run the bot in development mode:
```bash
npm run dev
```
This command uses `tsc-watch` to monitor your TypeScript files for changes and automatically recompile and restart the application (`tsx ./src/main.ts`) on success.

### Production Mode

This mode is intended for deploying the bot in a live environment. It usually involves building the project first and then running the optimized, compiled code.

To run the bot in production mode:
```bash
npm run start
```
This command first compiles the TypeScript project using `tsc` (according to your `tsconfig.json` settings) and then runs the main application file (`tsx ./src/main.ts`) from the compiled output (usually in the `build` directory). Check your `tsconfig.json` for the output directory if `tsx` is configured to run from `src` directly in this script.
Based on the provided `package.json`, the `start` script is `tsc && tsx ./src/main.ts`. This means it compiles TypeScript first, and then `tsx` executes the `src/main.ts` file. If `main.ts` imports from `./build/src/*` (as suggested by the `imports` field in `package.json`), `tsx` might be smart enough to use the compiled output, or it might be directly running the TS source again. For a true production build, one might expect `node ./build/src/main.js`. However, I will document the command as it is in `package.json`.

## Running Tests

This project uses Vitest for running tests, as indicated in `package.json` and likely configured in `vitest.config.ts` (if it exists).

To run the test suite:
```bash
npm run test
```

### Test Database Setup

Tests that interact with the database will likely require a separate test database instance.
The `docker-compose.yml` file defines a service for this purpose, typically named `test-db`.

1.  **Start the test database:**
    Before running tests, ensure your test database container is running:
    ```bash
    docker-compose up -d test-db
    ```
    This command starts the `test-db` service in detached mode.

2.  **Test Environment Configuration:**
    The test environment usually relies on a separate configuration file for database connection details, often `.env.test`. Make sure this file exists and its `DATABASE_URL` (or equivalent variable) points to the test database. For the `test-db` service defined in the provided `docker-compose.yml`:
    *   User: `test_user`
    *   Password: `test_password`
    *   Database Name: `test_db`
    *   Host: `localhost` (or your Docker host IP)
    *   Port: `5433` (as mapped in `docker-compose.yml`)

    Your `DATABASE_URL` in `.env.test` might look like:
    `postgresql://test_user:test_password@localhost:5433/test_db`

Ensure the test database is running and correctly configured before executing `npm run test`. Some tests might also require database migrations to be applied to the test database. You might need to run a command like `dotenv -e .env.test -- npx prisma migrate dev` or similar, depending on how your test environment and scripts are set up to handle migrations for the test database.

## Project Structure (Optional)

Here's a brief overview of the main directories and files:

```
lingua-tutor/
├── prisma/               # Prisma schema, migrations, and seed script
│   ├── migrations/       # Database migration files generated by Prisma
│   ├── schema.prisma     # Main Prisma schema file defining models and relations
│   └── seed.ts           # Script for populating the database with initial data
├── src/                  # Source code for the application
│   ├── bot/              # Telegram bot specific logic
│   │   ├── conversations/  # grammY conversation flows for multi-step interactions
│   │   ├── features/       # Core bot features, command handlers, and callbacks
│   │   ├── keyboards/      # Inline and reply keyboard layouts for bot messages
│   │   ├── middlewares/    # Custom middlewares for processing Telegram updates
│   │   ├── ...             # Other bot-related files (e.g., i18n setup, helper functions)
│   │   └── index.ts        # Main entry point for initializing and configuring the bot
│   ├── llm/              # Logic related to Large Language Model (LLM) integration
│   ├── server/           # Fastify server setup (for potential API or webhook listener)
│   │   ├── plugins/        # Fastify plugins to extend server functionality
│   │   ├── routes/         # API routes if the server exposes an HTTP interface
│   │   └── index.ts        # Main entry point for initializing and configuring the Fastify server
│   ├── repositories/     # Data access layer abstracting database interactions (using Prisma)
│   ├── services/         # Business logic services that orchestrate tasks
│   ├── types/            # Global TypeScript type definitions and interfaces
│   ├── utils/            # Utility functions and helper classes used across the project
│   ├── config.ts         # Application configuration loading and validation
│   ├── main.ts           # Main application entry point (initializes bot, server, etc.)
│   └── logger.ts         # Logger setup and configuration
├── locales/              # Internationalization (i18n) files for different languages
├── tests/                # Automated tests (unit, integration, etc.)
│   └── server/           # Server specific tests
├── .env.test             # Example environment variables for testing purposes
├── docker-compose.yml    # Docker Compose configuration for development services (e.g., db, test-db)
├── package.json          # Node.js project metadata, dependencies, and scripts
└── tsconfig.json         # TypeScript compiler options and project settings
```

## Contributing (Optional)

Contributions are welcome! If you have ideas for new features, improvements, or bug fixes, please feel free to contribute.

Here's a basic guideline for contributing:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/your-feature-name
    # or for bug fixes
    git checkout -b bugfix/issue-number
    ```
3.  **Make your changes.** Implement your feature or fix the bug.
4.  **Lint your code.** Ensure your code adheres to the project's linting standards:
    ```bash
    npm run lint
    ```
    (Note: This project uses `husky` and `lint-staged` to automatically lint staged files on commit, which should help catch issues early.)
5.  **Add tests.** If you're adding a new feature or fixing a bug, please include tests to cover your changes.
6.  **Commit your changes.** Write clear and descriptive commit messages.
7.  **Push your branch** to your forked repository.
8.  **Create a Pull Request** to the main `lingua-tutor` repository. Provide a clear description of your changes in the PR.

We appreciate your help in making Lingua Tutor better!
