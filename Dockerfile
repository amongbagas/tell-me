# Stage 0: Base Image and Dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 1: Build Next.js Application (named 'builder')
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
# ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production Dependencies (named 'production_deps')
FROM node:20-alpine AS production_deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: Final Image (named 'runner')
FROM node:20-alpine AS runner
WORKDIR /app
# ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=production_deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json


USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]