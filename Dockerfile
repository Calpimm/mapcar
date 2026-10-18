# syntax=docker/dockerfile:1.7
# Tek Dockerfile, üç hedef: api, web, admin
#   docker build --target api -t mapcar-api .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# --- bağımlılıklar (yalnızca manifest değişince yeniden kurulur) ---------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/db/package.json packages/db/
COPY packages/sim/package.json packages/sim/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- derleme ---------------------------------------------------------------------
FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# generate veritabanına bağlanmaz; config'in istediği URL için yer tutucu yeterli
RUN export DATABASE_URL=postgresql://build:build@localhost:5432/build \
 && pnpm --filter @mapcar/db generate \
 && pnpm turbo run build

# --- api -----------------------------------------------------------------------------
FROM build AS api
ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 4000
# Önce bekleyen migration'lar, sonra sunucu
CMD ["sh", "-c", "pnpm --filter @mapcar/db migrate:deploy && pnpm --filter @mapcar/db seed && node dist/index.js"]

# --- next uygulamaları (standalone) ----------------------------------------------------
FROM node:22-alpine AS next-runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
USER app

FROM next-runtime AS web
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public
ENV PORT=3010
EXPOSE 3010
CMD ["node", "apps/web/server.js"]

FROM next-runtime AS admin
COPY --from=build --chown=app:app /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=app:app /repo/apps/admin/public ./apps/admin/public
ENV PORT=3011
EXPOSE 3011
CMD ["node", "apps/admin/server.js"]
