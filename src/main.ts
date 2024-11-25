#!/usr/bin/env tsx
/* eslint-disable antfu/no-top-level-await */

import process from 'node:process';
import { createBot } from '#root/bot/index.js';
import { config } from '#root/config.js';
import { logger } from '#root/logger.js';
import { prisma } from '#root/prisma/index.js';
import { createServer, createServerManager } from '#root/server/index.js';
import { run, type RunnerHandle } from '@grammyjs/runner';

async function startBot() {
  const bot = createBot(config.botToken, {
    config,
    logger,
    prisma,
  });
  let runner: undefined | RunnerHandle;

  // graceful shutdown
  onShutdown(async () => {
    logger.info('Shutdown bot');
    await runner?.stop();
  });

  await bot.init();

  if (config.isWebhookMode && config.botWebhook) {
    // set webhook if webhook mode
    await bot.api.setWebhook(config.botWebhook, {
      allowed_updates: config.botAllowedUpdates,
      secret_token: config.botWebhookSecret,
    });
    logger.info({
      msg: 'Webhook was set',
      url: config.botWebhook,
    });
  }
  else {
    // delete ewbhook if polling mode
    await bot.api.deleteWebhook();
    logger.info('Webhook deleted for polling mode');

    // start runner for polling
    runner = run(bot, {
      runner: {
        fetch: {
          allowed_updates: config.botAllowedUpdates,
        },
      },
    });
    logger.info({
      msg: 'Bot running in polling mode...',
      username: bot.botInfo.username,
    });
  }

  return bot;
}

async function startServer(bot: ReturnType<typeof createBot>) {
  const server = await createServer({
    bot,
    config,
    logger,
  });

  const serverManager = createServerManager(server, {
    host: config.serverHost,
    port: config.serverPort,
  });

  // graceful shutdown
  onShutdown(async () => {
    logger.info('Shutdown server');
    await serverManager.stop();
  });

  // start server
  const info = await serverManager.start();
  logger.info({
    msg: 'Server started',
    url: info.url,
  });
}

try {
  // connect to database
  await prisma.$connect();

  // start bot
  const bot = await startBot();

  // start server
  await startServer(bot);
}
catch (error) {
  logger.error(error);
  process.exit(1);
}

// Utils

function onShutdown(cleanUp: () => Promise<void>) {
  let isShuttingDown = false;
  const handleShutdown = async () => {
    if (isShuttingDown)
      return;
    isShuttingDown = true;
    await cleanUp();
  };
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}
