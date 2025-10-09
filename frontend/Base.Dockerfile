FROM node:22

RUN apt-get update && apt-get install -y --no-install-recommends nginx \
    && adduser --system --no-create-home --disabled-login --disabled-password --group nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@latest

ENV PATH /app/node_modules/.bin:$PATH

COPY pnpm-lock.yaml ./
COPY package.json ./

RUN pnpm install --frozen-lockfile