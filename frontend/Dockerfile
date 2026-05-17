# Source: research/ARCHITECTURE.md §"Pattern 1" + research/STACK.md §"Docker base image"
# Build-Stage: pnpm (oder npm) build → dist/
FROM node:22-alpine AS builder
WORKDIR /app

# Layer-Caching: erst Manifest + Lock, dann Source
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src

RUN pnpm build
# → /app/dist/index.html + /app/dist/assets/*

# Runtime-Stage: nginx servt dist/ + reverse-proxy
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
# CMD-Default von nginx:alpine ist bereits richtig (nginx -g 'daemon off;')
