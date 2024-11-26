import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

const authenticatePlugin: FastifyPluginAsync = fp(async (server: FastifyInstance) => {
  const { config } = server;

  server.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  server.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    }
    catch {
      throw server.httpErrors.unauthorized('JWT is invalid');
    }
  });
});

export default authenticatePlugin;
