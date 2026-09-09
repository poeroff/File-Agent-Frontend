FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM base AS build
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
# they must arrive here as build args (docker-compose passes them from .env).
ARG NEXT_PUBLIC_DIRECT_STORAGE_HOST
ENV NEXT_PUBLIC_DIRECT_STORAGE_HOST=$NEXT_PUBLIC_DIRECT_STORAGE_HOST
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
