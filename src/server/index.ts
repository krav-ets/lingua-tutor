import Fastify from 'fastify';
import { webhookCallback } from 'grammy';
import type { Bot } from '#root/bot/index.js';
import type { Logger } from '#root/logger.js';
import type { Config } from '#root/config.js';

interface Dependencies {
  bot: Bot;
  config: Config;
  logger: Logger;
}

export function createServer(dependencies: Dependencies) {
  const { bot, config, logger } = dependencies;

  // Создаем экземпляр Fastify
  const server = Fastify({
    logger: {
      level: config.isDebug ? 'debug' : 'info',
    },
  });


  // Обработка ошибок
  server.setErrorHandler((error, request, reply) => {
    const reqLogger = request.log;
    if (error.statusCode && error.statusCode < 500) {
      reqLogger.info(error);
    } else {
      reqLogger.error({
        err: error,
        method: request.method,
        path: request.url,
      });
    }
    reply.status(error.statusCode || 500).send({ error: 'Oops! Something went wrong.' });
  });

  // Маршрут для проверки статуса сервера
  server.get('/', async (request, reply) => {
    return { status: true };
  });

  // Обработка вебхуков
  if (config.isWebhookMode) {
    server.post('/webhook', webhookCallback(bot, 'fastify', {
      secretToken: config.botWebhookSecret,
    }));
  }

  return server;
}

export type Server = Awaited<ReturnType<typeof createServer>>;

export function createServerManager(server: Server, options: { host: string, port: number }) {
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
