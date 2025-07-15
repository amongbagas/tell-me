# Stage 1: Base Image and Dependencies
FROM node:20-alpine AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js Application (named 'builder')
FROM node:20-alpine AS builder
COPY . .
COPY --from=deps /node_modules ./node_modules
RUN npm run build

# Stage 3: Final Image (named 'runner')
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]