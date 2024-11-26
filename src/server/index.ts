import type { Bot } from '#root/bot/index.js';
import type { Config } from '#root/config.js';
import type { Logger } from '#root/logger.js';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AutoLoad from '@fastify/autoload';
import Fastify from 'fastify';
import { webhookCallback } from 'grammy';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

interface Dependencies {
  bot: Bot;
  config: Config;
  logger: Logger;
}

export function createServer(dependencies: Dependencies) {
  const { bot, config } = dependencies;

  // create fastify instance
  const server = Fastify({
    logger: {
      level: config.isDebug ? 'debug' : 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    ignoreTrailingSlash: true,
    caseSensitive: false,
  });

  server.decorate('config', config);

  // register autoload for plugins
  server.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    ignorePattern: /.+no-load\.js/,
  });

  // register autoload for routes
  server.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    indexPattern: /.*routes(\.js|\.cjs)$/i,
    ignorePattern: /.*\.js/,
    autoHooksPattern: /.*hooks(\.js|\.cjs)$/i,
    autoHooks: true,
    cascadeHooks: true,
    options: {
      prefix: '/api',
    },
  });

  // error handling
  server.setErrorHandler((error, request, reply) => {
    const reqLogger = request.log;
    if (error.statusCode && error.statusCode < 500) {
      reqLogger.info(error);
    }
    else {
      reqLogger.error({
        err: error,
        method: request.method,
        path: request.url,
      });
    }

    reply.status(error.statusCode || 500).send({ error: 'Oops! Something went wrong.' });
  });

  // registry webhook route
  if (config.isWebhookMode) {
    server.post('/webhook', webhookCallback(bot, 'fastify', {
      secretToken: config.botWebhookSecret,
    }));
  }

  return server;
}

export type Server = Awaited<ReturnType<typeof createServer>>;

export function createServerManager(server: Server, options: { host: string; port: number }) {
  return {
    async start() {
      await server.listen({ port: options.port, host: options.host });
      const addressInfo = server.server.address();

      if (!addressInfo) {
        throw new Error('Server address information is not available');
      }

      const url = typeof addressInfo === 'string'
        ? addressInfo
        : addressInfo && addressInfo.family === 'IPv6'
          ? `http://[${addressInfo.address}]:${addressInfo.port}`
          : `http://${addressInfo.address}:${addressInfo.port}`;
      return { url };
    },
    async stop() {
      await server.close();
    },
  };
}
