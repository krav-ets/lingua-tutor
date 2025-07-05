import type { Context } from '#root/bot/context.js';
import type { Middleware, RawApi, Transformer } from 'grammy';
import { performance } from 'node:perf_hooks';
import { getUpdateInfo } from '#root/bot/helpers/logging.js';

export function updateLogger(): Middleware<Context> {
  return async (ctx, next) => {
    const transformer: Transformer<RawApi> = (previous, method, payload, signal) => {
      ctx.logger.debug({
        msg: 'Bot API call',
        method,
        payload,
      });

      return previous(method, payload, signal);
    };
    ctx.api.config.use(transformer);

    ctx.logger.debug({
      msg: 'Update received',
      update: getUpdateInfo(ctx),
    });

    const startTime = performance.now();
    try {
      await next();
    }
    finally {
      const endTime = performance.now();
      ctx.logger.debug({
        msg: 'Update processed',
        elapsed: endTime - startTime,
      });
    }
  };
}
