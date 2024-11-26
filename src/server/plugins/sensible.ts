import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import fp from 'fastify-plugin';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(sensible);
});
