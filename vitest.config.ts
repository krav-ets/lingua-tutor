import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    server: {
      deps: {
        inline: ['@fastify/autoload'],
      },
    },
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
