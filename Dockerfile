# ── Stage 1: Build ───────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "build"]
