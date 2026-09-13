# syntax=docker/dockerfile:1
# Image de l'API. Le monorepo est copie pour les packages partages (@lv/*, sources TypeScript),
# puis l'API est compilee en un seul fichier JavaScript (scripts/bundle.mjs) : demarrage en 1 a 2 s
# apres une mise en veille Fly, au lieu de ~11 s via tsx (le proxy Fly abandonne apres ~8 s).
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

RUN node apps/api/scripts/bundle.mjs

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
EXPOSE 4000
USER node
CMD ["node", "--enable-source-maps", "apps/api/dist/main.mjs"]
