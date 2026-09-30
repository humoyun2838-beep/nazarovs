FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV npm_config_build_from_source=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts \
  && (node -e "require('better-sqlite3'); console.log('better-sqlite3 ok')" \
    || npm rebuild better-sqlite3 --build-from-source)

COPY . .
RUN npm run build \
  && mkdir -p /app/seed \
  && cp data/nazarov.db /app/seed/nazarov.db

ENV DATA_DIR=/app/data
EXPOSE 3847

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
