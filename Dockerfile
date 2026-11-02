# Build stage - Frontend
FROM node:26 AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# vite build only; type checking is separate (tsc -b is part of `npm run build`)
COPY . .
RUN npx vite build

# Build stage - Backend
FROM node:26 AS backend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
RUN npm run build:server

# Final stage - Production runtime
FROM node:26-slim

WORKDIR /app
ENV NODE_ENV=production

# dumb-init for proper signal handling
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Production dependencies first for better layer caching
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend-build --chown=node:node /app/dist/server ./server
COPY --from=frontend-build --chown=node:node /app/dist ./public

# Built-in non-root user from the official node image
USER node

# Expose port for API
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server/index.js"]
