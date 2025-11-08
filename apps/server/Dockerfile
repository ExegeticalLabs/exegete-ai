FROM node:20-alpine AS deps
WORKDIR /app
COPY ../../package.json ../../pnpm-workspace.yaml ../../tsconfig.base.json ./
COPY package.json ./apps/server/package.json
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm fetch

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate \
 && pnpm i -w --offline \
 && pnpm -C apps/server build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/apps/server/dist ./dist
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["node","dist/server.js"]
