import type { FastifyPluginAsync } from 'fastify';

const rootRoute: FastifyPluginAsync = async (server) => {
  server.get('/', async () => {
    return { status: 'OK' };
  });
};

export default rootRoute;
