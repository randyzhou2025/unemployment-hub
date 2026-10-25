FROM node:24.22.0-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @uh/api build && pnpm --filter @uh/admin build

FROM node:24.22.0-alpine AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]

FROM nginx:1.28-alpine AS web
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
