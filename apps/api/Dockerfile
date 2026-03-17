FROM node:20-alpine AS base

# curl for health checks
RUN apk add --no-cache curl python3 make g++
# python3/make/g++ needed for native esbuild bindings on Alpine

WORKDIR /app
RUN npm install -g pnpm

FROM base AS production
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY apps/api/dist ./dist
COPY packages ./packages

RUN mkdir -p /tmp/publish-builds && chmod 1777 /tmp/publish-builds

RUN adduser -D -u 1001 appuser
RUN chown appuser:appuser /tmp/publish-builds

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/main.js"]