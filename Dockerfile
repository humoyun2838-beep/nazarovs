FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && mkdir -p /app/seed \
  && cp data/nazarov.db /app/seed/nazarov.db \
  && chmod +x scripts/docker-entrypoint.sh

ENV DATA_DIR=/app/data
EXPOSE 3847

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
