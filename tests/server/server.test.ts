import { createBot } from '#root/bot/index.js';
import { config } from '#root/config.js';
import { logger } from '#root/logger.js';
import { prisma } from '#root/prisma/index.js';
import { createServer } from '#root/server/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Пример теста
describe('fastify server', () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const bot = createBot(config.botToken, { config, logger, prisma });
    server = await createServer({ bot, config, logger });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should respond 200 on GET /api', async () => {
    const response = await server.inject({ method: 'GET', url: '/api' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'OK' });
  });

  it('should return 401 if no token provided', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1',
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 200 with valid token', async () => {
    const token = server.jwt.sign({ id: 123 });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'OK' });
  });
});
