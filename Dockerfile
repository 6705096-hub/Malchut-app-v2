FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
# Make prisma schema available immediately so postinstall generate works
COPY prisma ./prisma/
RUN npm install --no-package-lock --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Provide a dummy URL for Prisma to pass schema validation during static page generation
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
# 'npm install' triggered 'prisma generate' earlier via postinstall script
RUN rm -rf .next
RUN npm run build

FROM base AS runner
# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh
RUN touch ./startup.log && chown nextjs:nodejs ./startup.log

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["sh", "start.sh"]

