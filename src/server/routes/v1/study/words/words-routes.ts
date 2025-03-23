import type { FastifyPluginAsync } from 'fastify';

const wordsRoute: FastifyPluginAsync = async (server) => {
  server.addHook('onRequest', server.authenticate);
  server.get('/next', async () => {
    return { status: 'OK' };
  });
};

export default wordsRoute;
