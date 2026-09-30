FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# better-sqlite3 needs these if the Linux prebuild is not used
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --foreground-scripts

COPY . .
RUN npm run build \
  && mkdir -p /app/seed \
  && cp data/nazarov.db /app/seed/nazarov.db \
  && chmod +x scripts/docker-entrypoint.sh

ENV DATA_DIR=/app/data
EXPOSE 3847

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]

COPY . .
RUN npm run build \
  && mkdir -p /app/seed \
  && cp data/nazarov.db /app/seed/nazarov.db \
  && chmod +x scripts/docker-entrypoint.sh

ENV DATA_DIR=/app/data
EXPOSE 3847

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
