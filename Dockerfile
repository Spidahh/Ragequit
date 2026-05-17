# RAGEQUIT — server Docker image (Fase 9 v0.1).
#
# Multi-stage Node 20 build that compiles the TypeScript sources, prunes dev
# deps, and produces a minimal runtime image suitable for Fly.io single-region
# deploy. Cloudflare R2 + Supabase secrets land via Fly.io secrets at runtime,
# not baked in.
#
# Build:   docker build -t ragequit-server .
# Run:     docker run --rm -e PORT=2567 -p 2567:2567 ragequit-server

# ---- builder ----
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Enable corepack so the lockfile-bound pnpm version is used.
RUN corepack enable

# Copy lockfile + package manifests first so the install layer caches well.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# pnpm.onlyBuiltDependencies (in package.json) controls which native deps
# are rebuilt (esbuild, msgpackr-extract). Don't use --ignore-scripts here.
RUN pnpm install --frozen-lockfile

# Now bring in the source + tsconfigs.
COPY tsconfig.base.json ./
COPY packages ./packages

# Build the shared lib then the server.
RUN pnpm --filter @ragequit/shared build
RUN pnpm --filter @ragequit/server build

# Prune dev deps for the runtime image.
RUN pnpm --filter @ragequit/server --prod deploy /app/runtime
COPY packages/shared/dist /app/runtime/node_modules/@ragequit/shared/dist
COPY packages/shared/package.json /app/runtime/node_modules/@ragequit/shared/package.json

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=2567
COPY --from=builder /app/runtime ./
EXPOSE 2567
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1
CMD ["node", "dist/main.js"]
