FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

RUN mkdir -p data

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
