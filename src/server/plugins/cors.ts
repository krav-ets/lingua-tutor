import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyCors);
});
