FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/admin/package.json ./apps/admin/package.json
RUN pnpm install --frozen-lockfile --filter @ali-oss-server/admin --filter @ali-oss-server/server

FROM deps AS build

COPY apps/server ./apps/server
COPY apps/admin ./apps/admin
COPY .env.example ./
COPY README.md ./
RUN pnpm --filter @ali-oss-server/admin build && pnpm --filter @ali-oss-server/server build

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/admin/package.json ./apps/admin/package.json
RUN pnpm install --frozen-lockfile --prod --filter @ali-oss-server/server

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/admin/dist ./apps/admin/dist

EXPOSE 9512

CMD ["node", "apps/server/dist/index.js"]
