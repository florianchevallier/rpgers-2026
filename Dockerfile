# Critiquest — build standalone mono-conteneur (SQLite embarqué, cf. plan §6).
# Build : docker build -t critiquest .
# Run   : docker run -d --name critiquest -p 3000:3000 \
#           -e SESSION_SECRET=... -e DATABASE_URL=file:/data/prod.db \
#           -v critiquest-data:/data critiquest

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 = module natif : toolchain nécessaire, puis rebuild explicite
# (--ignore-scripts saute lefthook/postinstall, mais aussi node-gyp → rebuild)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --ignore-scripts \
    && npm rebuild better-sqlite3

FROM node:24-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=dev
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NEXT_TELEMETRY_DISABLED=1
# SESSION_SECRET factice : le build évalue env.ts, la vraie valeur vient au run
RUN npx prisma generate \
    && SESSION_SECRET=build-time-placeholder-32-characters npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs \
    && mkdir /data && chown nextjs:nodejs /data
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# migrations appliquées au démarrage (SQLite dans le volume /data) via un
# runner minimal — le CLI prisma est trop lourd pour l'image standalone
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-migrations.js ./scripts/apply-migrations.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
