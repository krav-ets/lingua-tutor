import type { FastifyPluginAsync } from 'fastify';

const rootRoute: FastifyPluginAsync = async (server) => {
  server.get('/', async () => {
    return { hello: 'world' };
  });
};

export default rootRoute;
