import { config } from '#root/config.js';
import { logger } from '#root/logger.js';
import { createServer } from '#root/server/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('study Words Endpoints', () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    // const bot = createBot(config.botToken, { config, logger, prisma });
    server = await createServer({ config, logger });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('gET /study/words/next should return a new word', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/study/words/next',
    });
    expect(response.statusCode).toBe(200);
    // Add more assertions based on the response
  });

  it('pATCH /study/words/:id should update word status', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/study/words/1',
      payload: { status: 'inProgress' },
    });
    expect(response.statusCode).toBe(200);
    // Add more assertions based on the response
  });

  it('gET /study/words?filter=repeat should return words to repeat', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/study/words?filter=repeat',
    });
    expect(response.statusCode).toBe(200);
    // Add more assertions based on the response
  });

  it('pOST /study/words/:id/review should record review result', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/study/words/1/review',
      payload: { quality: 4 },
    });
    expect(response.statusCode).toBe(200);
    // Add more assertions based on the response
  });
});
