# Dockerfile — Next.js 15 standalone multi-stage
# Build: docker build -t medicamentum .
# Run:   docker run -p 3000:3000 medicamentum

FROM node:20-alpine AS base

# Etapa 1: instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Etapa 2: build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BRAND_COLOR=#8127cf
ENV NEXT_PUBLIC_BRAND_COLOR=$NEXT_PUBLIC_BRAND_COLOR

RUN npx prisma generate
RUN npm run build

# Etapa 3: imagen de producción (mínima)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
