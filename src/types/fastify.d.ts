import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    authenticate: any;
    jwt: JWT;
  }

  interface FastifyRequest {
    user: {
      id: number;
    };
  }
}
