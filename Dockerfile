# ---------- build (builder) ----------
FROM node:20-bookworm AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma/migrations ./prisma/migrations
RUN npm ci && npx prisma generate

COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- runtime (final) ----------
FROM node:20-slim
RUN apt-get update \
 && apt-get install -y postgresql-client \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY locales ./locales

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "build/src/main.js"]
