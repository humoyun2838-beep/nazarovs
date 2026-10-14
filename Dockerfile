FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN NODE_ENV=development npm ci --include=dev --ignore-scripts=true \
  && npm rebuild better-sqlite3 --ignore-scripts=false \
  && node -e "const D=require('better-sqlite3');new D(':memory:').close()"
COPY . .
RUN mkdir -p /app/seed /tmp/nazarov-build \
  && cp data/nazarov.db /app/seed/nazarov.db \
  && cp data/nazarov.db /tmp/nazarov-build/nazarov.db \
  && DATA_DIR=/tmp/nazarov-build NODE_ENV=production npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATA_DIR=/app/data PORT_ALLOW_OVERRIDE=1 SEPARATE_SITES=0 COOKIE_SECURE=1
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/seed ./seed
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json /app/next.config.ts /app/tsconfig.json ./
EXPOSE 8080
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
