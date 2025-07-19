# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production --frozen-lockfile && npm cache clean --force

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Set dummy environment variables for build process
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV BETTER_AUTH_SECRET="dummy-secret-for-build"
ENV BETTER_AUTH_URL="http://dummy:3000"
ENV RESEND_API_KEY="dummy-api-key-for-build"
ENV EMAIL_SENDER_NAME="Dummy"
ENV EMAIL_SENDER_ADDRESS="noreply@dummy.com"
ENV GOOGLE_CLIENT_ID="dummy-google-client-id"
ENV GOOGLE_CLIENT_SECRET="dummy-google-client-secret"
ENV NEXT_PUBLIC_WEBSOCKET_URL="ws://dummy:8080"
ENV WEBSOCKET_PORT="8080"

RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only necessary files for standalone mode
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy the Next.js build output (standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use the standalone server
CMD ["node", "server.js"]