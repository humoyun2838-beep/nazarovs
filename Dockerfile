FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV npm_config_ignore_scripts=true
ENV npm_config_build_from_source=false

COPY package.json package-lock.json .npmrc ./
COPY vendor/better-sqlite3/linux-x64.node /tmp/linux-x64.node
# Railway sets NODE_ENV=production; keep dev/build packages for Next + Tailwind.
RUN NODE_ENV=development npm ci --ignore-scripts=true --include=dev \
  && mkdir -p node_modules/better-sqlite3/prebuilds \
  && cp /tmp/linux-x64.node node_modules/better-sqlite3/prebuilds/linux-x64.node \
  && node -e "require('better-sqlite3'); console.log('better-sqlite3 ok')" \
  && node -e "require.resolve('@tailwindcss/postcss'); console.log('tailwind postcss ok')"

COPY . .
RUN NODE_ENV=production npm run build \
  && mkdir -p /app/seed \
  && cp data/nazarov.db /app/seed/nazarov.db

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
EXPOSE 3847

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
