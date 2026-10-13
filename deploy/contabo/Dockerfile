# Same Node major version used by the certified Linux build.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# This is public build metadata, not a password or provider secret.
ARG NEXT_PUBLIC_APP_URL=https://example.invalid
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
# Build-time placeholders: real secrets are only provided at container runtime.
RUN AUTH_SECRET=nonsecret-build-only-placeholder-more-than-32-characters \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npm run build

FROM builder AS production-dependencies
# Prune development tools, including Genkit and Tailwind, before copying into runtime.
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/drizzle.config.ts /app/next.config.ts /app/tsconfig.json ./
USER node
EXPOSE 3000 9003
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
