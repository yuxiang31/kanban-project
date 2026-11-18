# syntax=docker/dockerfile:1

# One image runs everything: Fastify serves the API, the WebSocket and the
# built React app on one port. SQLite lives on the /data volume.
#
#   docker build -t kanban .
#   docker run -p 3000:3000 -e JWT_SECRET=... -v kanban-data:/data kanban
#
# better-sqlite3 ships prebuilt binaries for Alpine (linuxmusl), so no
# compiler toolchain is needed in any stage.

ARG NODE_VERSION=26

# ---- Build the web app ----
FROM node:${NODE_VERSION}-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund
COPY apps/web apps/web
RUN npm run build -w apps/web

# ---- Server production dependencies only ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w apps/server --no-audit --no-fund

# ---- Runtime ----
FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DB_PATH=/data/kanban.db \
    WEB_DIST_DIR=/app/apps/web/dist
WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY package.json ./
COPY apps/server/package.json apps/server/
COPY apps/server/src apps/server/src
COPY --from=web /app/apps/web/dist apps/web/dist

# Run as the image's unprivileged "node" user; it owns the data volume.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000

# /api/health also runs a database query, so a broken volume shows as
# unhealthy. busybox wget is part of the Alpine base image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "apps/server/src/index.js"]
