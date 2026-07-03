# ────────────────────────────────────────
# Stage 1: Install dependencies
# ────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ────────────────────────────────────────
# Stage 2: Production image
# ────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S rateshield -u 1001

# Copy dependencies and application code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Remove dev files
RUN rm -rf src/tests scripts .env .git

# Set ownership
RUN chown -R rateshield:nodejs /app

USER rateshield

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENV NODE_ENV=production

CMD ["node", "server.js"]
