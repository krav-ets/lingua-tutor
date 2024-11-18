import type { Context } from '#root/bot/context.js';
import { userRepository } from '#root/repositories/user.repository.js';

export async function fetchUserMiddleware(ctx: Context, next: () => Promise<void>) {
  const userId = ctx.from?.id;
  if (userId) {
    ctx.user = await userRepository.findByTelegramId(userId);
  }
  await next();
}
