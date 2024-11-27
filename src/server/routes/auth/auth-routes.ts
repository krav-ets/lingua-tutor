import type { FastifyPluginAsync } from 'fastify';
import { userRepository } from '#root/repositories/user.repository.js';
import { verifyTelegramAuth } from '#root/utils/telegram-auth.js';

const authRoute: FastifyPluginAsync = async (server) => {
  const config = server.config;

  server.post('/', async (request) => {
    if (!request.body) {
      throw server.httpErrors.badRequest('Missing request body');
    }

    const { initData } = request.body as { initData: string };

    if (!initData) {
      throw server.httpErrors.badRequest('Missing initData');
    }

    const data = Object.fromEntries(new URLSearchParams(initData));
    // check data from telegram
    const isValid = verifyTelegramAuth(data, config.botToken);

    if (!isValid) {
      throw server.httpErrors.unauthorized('Invalid Telegram data');
    }

    const telegramId = Number(data.id);

    // find user in DB
    const user = await userRepository.findByTelegramId(telegramId);

    if (!user) {
      throw server.httpErrors.notFound('User not found');
    }

    // generate JWT token
    const token = server.jwt.sign({ id: user.id });

    return { token };
  });
};

export default authRoute;
