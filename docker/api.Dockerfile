# Stage 1: base — shared node + pnpm setup
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Stage 2: deps — install dependencies + generate Prisma client
FROM base AS deps
COPY pnpm-workspace.yaml .npmrc package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY prisma/schema.prisma ./prisma/
RUN pnpm install --frozen-lockfile --filter api...
# Generate client here — output goes to node_modules/.prisma/client (root),
# where the hoisted @prisma/client package can find it at runtime.
RUN pnpm --filter api exec prisma generate --schema=../../prisma/schema.prisma

# Stage 3: builder — compile TypeScript
FROM deps AS builder
COPY apps/api ./apps/api
COPY tsconfig.base.json ./
RUN pnpm --filter api exec nest build

# Stage 4: runner — minimal production image
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=deps /app/prisma ./prisma
EXPOSE 6201
CMD ["node", "apps/api/dist/main"]
