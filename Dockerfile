# Build stage
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install system dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Install Playwright and browsers in production
RUN npx playwright install chromium

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional runtime files if needed
COPY --from=builder /app/src ./src

# Change ownership to app user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Run the application
CMD ["node", "dist/index.mjs"]
