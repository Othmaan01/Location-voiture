# syntax=docker/dockerfile:1
# Image de l'API. Le monorepo est copie en entier pour les packages partages ;
# l'execution passe par tsx (les packages @lv/* sont des sources TypeScript).
# TECH DEBT : produire un bundle JS unique (tsup) pour une image plus petite.
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/pricing/package.json packages/pricing/
COPY packages/tokens/package.json packages/tokens/
RUN pnpm install --frozen-lockfile --filter @lv/api...

COPY packages ./packages
COPY apps/api ./apps/api

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
EXPOSE 4000
USER node
CMD ["node", "--import", "tsx", "apps/api/src/main.ts"]
