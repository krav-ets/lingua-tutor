import type { FastifyPluginAsync } from 'fastify';

const v1Route: FastifyPluginAsync = async (server) => {
  server.addHook('onRequest', server.authenticate);
  server.get('/', async () => {
    return { status: 'OK' };
  });
};

export default v1Route;
