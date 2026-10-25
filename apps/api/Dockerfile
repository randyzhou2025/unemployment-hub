FROM node:24.22.0-alpine AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/domain/package.json ./packages/domain/package.json
RUN --mount=type=cache,id=unemployment-hub-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @uh/api... --filter @uh/admin...

FROM dependencies AS shared
COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY packages/domain ./packages/domain

FROM shared AS production-dependencies
RUN --mount=type=cache,id=unemployment-hub-pnpm,target=/pnpm/store,sharing=locked \
    pnpm --filter @uh/api --prod deploy --legacy /runtime/api --store-dir /pnpm/store

FROM shared AS build-api
COPY apps/api ./apps/api
RUN pnpm --filter @uh/api build

FROM shared AS build-admin
COPY apps/admin ./apps/admin
RUN pnpm --filter @uh/admin build

FROM node:24.22.0-alpine AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=production-dependencies --chown=node:node /runtime/api/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /runtime/api/node_modules ./node_modules
COPY --from=build-api --chown=node:node /app/apps/api/dist ./dist
COPY --from=build-api --chown=node:node /app/apps/api/drizzle ./drizzle
COPY --from=build-admin --chown=node:node /app/apps/admin/dist /app/apps/admin/dist
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
