# ── Stage 1: Dependencies ─────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Build / Dev deps for potential build steps ──────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .

# ── Stage 3: Production image ─────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeuser -u 1001

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy source
COPY --chown=nodeuser:nodejs . .

# Create logs directory
RUN mkdir -p /app/logs && chown nodeuser:nodejs /app/logs

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
