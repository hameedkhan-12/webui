FROM node:20-alpine AS base

# curl for health checks
RUN apk add --no-cache curl python3 make g++
# python3/make/g++ needed for native esbuild bindings on Alpine

WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml* ./
RUN npm install -g pnpm

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build:api
RUN node -e "require('esbuild').version && console.log('esbuild ok')"

FROM base AS production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/api ./dist/apps/api
COPY --from=build /app/shared ./shared

RUN mkdir -p /tmp/publish-builds && chmod 1777 /tmp/publish-builds

RUN adduser -D -u 1001 appuser
RUN chown appuser:appuser /tmp/publish-builds

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]