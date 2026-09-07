# syntax=docker/dockerfile:1
# Image du site web (Next.js). Le monorepo est copie pour les contrats partages ;
# la compilation se fait ici avec les variables publiques passees en arguments.
FROM node:22-alpine AS build
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
RUN pnpm install --frozen-lockfile --filter @lv/web...
COPY packages ./packages
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME="Location Voiture"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && pnpm exec next build --webpack

FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo ./
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
USER node
WORKDIR /repo/apps/web
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
