# syntax=docker/dockerfile:1
# Multi-stage build for the RAGEQUIT game server.
# Build context must be the monorepo root (pnpm workspace).

# ─── Stage 1: deps + build ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

# pnpm is needed to install workspace deps.
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json       packages/shared/
COPY packages/server/package.json       packages/server/
# Client package.json is not needed at runtime but pnpm needs it for the
# workspace graph — copy a minimal version so install doesn't fail.
COPY packages/client/package.json       packages/client/
# Use a fast pnpm store path inside the image layer.
RUN echo "store-dir=/tmp/pnpm-store" > .npmrc

RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source for shared + server only; client is not built server-side.
COPY tsconfig.base.json ./
COPY packages/shared/  packages/shared/
COPY packages/server/  packages/server/

# Build shared declarations first, then the server.
RUN pnpm --filter=@ragequit/shared build
RUN pnpm --filter=@ragequit/server build

# ─── Stage 2: runtime image ──────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy package manifests (workspace graph required by pnpm deploy).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json       packages/shared/
COPY packages/server/package.json       packages/server/
COPY packages/client/package.json       packages/client/
# pnpm v10 requires inject-workspace-packages=true for `pnpm deploy` in
# monorepos (ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE). Keep this out of the
# root .npmrc so the lockfile stays in non-injected format for normal dev.
RUN printf "store-dir=/tmp/pnpm-store\ninject-workspace-packages=true\n" > .npmrc

# Use pnpm deploy to extract only production deps for the server.
COPY --from=builder /app/packages/shared/dist  packages/shared/dist/
COPY --from=builder /app/packages/server/dist  packages/server/dist/

RUN pnpm deploy --filter=@ragequit/server --prod /app/deploy

# Copy built artefacts into the deployed output.
COPY --from=builder /app/packages/server/dist  /app/deploy/dist/
COPY --from=builder /app/packages/shared/dist  /app/deploy/node_modules/@ragequit/shared/dist/

WORKDIR /app/deploy

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/main.js"]
