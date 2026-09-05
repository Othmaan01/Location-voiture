# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/pricing/package.json packages/pricing/
COPY packages/tokens/package.json packages/tokens/
RUN pnpm install --frozen-lockfile --filter @lv/api...

FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @lv/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
USER node
COPY --from=build --chown=node:node /repo ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
