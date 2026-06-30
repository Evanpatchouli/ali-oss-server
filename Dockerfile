FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/admin/package.json ./apps/admin/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps ./apps
COPY .env.example ./
COPY README.md ./
RUN pnpm build

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/admin/package.json ./apps/admin/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/admin/dist ./apps/admin/dist

EXPOSE 9512

CMD ["node", "apps/server/dist/index.js"]
