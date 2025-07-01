# ---------- build (builder) ----------
FROM node:20-bookworm AS builder
WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build                     # → dist/

# ---------- runtime (final) ----------
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
