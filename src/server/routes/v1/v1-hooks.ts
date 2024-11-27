import fp from 'fastify-plugin';

export default fp(async (server) => {
  server.addHook('onRequest', server.authenticate);
});
